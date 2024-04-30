// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import OpenAI from 'openai'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import * as DDG from 'duck-duck-scrape'

const DEFAULT_MODEL_NAME = 'moonshot-v1-8k'
const baseUrl = 'https://api.moonshot.cn/v1'

const convertMessages = (messages: ICommonDalArgs['messages']) => {
    let history = _.map(messages, message => {
        return {
            role: message.role == Roles.model ? Roles.assistant : message.role,
            content: message.content,
        }
    })
    return {
        history: history,
    }
}

const fetchMoonshot = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
        searchWeb,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || {}
    const API_KEY = apiKey || env?.MOONSHOT_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Moonshot'
    }
    const { history } = convertMessages(messages)
    const openai = new OpenAI({
        baseURL: baseUrl,
        apiKey: API_KEY,
    })

    let chatParams: Record<string, any> = {
        model: modelUse,
        max_tokens,
        temperature: 0,
        // @ts-ignore
        messages: history,
    }

    let tools: any[] = []
    if (searchWeb) {
        history.unshift({
            role: Roles.system,
            content: `你是一个具有联网功能的智能助手，如果用户的提问的内容可以通过联网获取更新信息，你就一定会使用 get_internet_serch_result tool 来获取相关联网资料，再根据资料结合用户的提问来回答。`,
        })
        tools = [
            {
                type: 'function',
                function: {
                    name: 'get_internet_serch_result',
                    description: 'Get the latest search results from DuckDuckGo',
                    parameters: {
                        type: 'object',
                        properties: {
                            searchText: {
                                type: 'string',
                                description: 'The text to search',
                            },
                            count: {
                                type: 'int',
                                description: 'The search result count',
                            },
                        },
                    },
                },
            },
        ]
        // chatParams.messages = history;
        // chatParams.tools = tools;
    }
    console.log(`isStream`, isStream)

    if (isStream) {
        try {
            const completion = await openai.chat.completions.create({
                model: modelUse,
                max_tokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
                stream: true,
            })

            let content = ``
            for await (const chunk of completion) {
                const text = chunk.choices[0].delta.content
                console.log(`Moonshot text`, text)
                if (text) {
                    streamHandler({
                        token: text,
                        status: true,
                    })
                    content += text
                }
            }
            completeHandler({
                content: content,
                status: true,
            })
        } catch (e) {
            console.log(`Moonshot error`, e)

            completeHandler({
                content: '',
                status: false,
            })
        }
    } else {
        let msg = ''
        try {
            if (searchWeb) {
                const firstRoundResult = await openai.chat.completions.create({
                    model: modelUse,
                    max_tokens,
                    temperature: 0,
                    // @ts-ignore
                    messages: history,
                    tool_choice: 'auto',
                    tools,
                })
                const firstRoundMessage = firstRoundResult?.choices?.[0]?.message
                const firstRoundFunction = firstRoundMessage?.tool_calls?.[0]?.function
                console.log(`firstRoundMessage`, firstRoundMessage)
                console.log(`firstRoundFunction`, firstRoundFunction)
                if (firstRoundFunction?.name === 'get_internet_serch_result') {
                    let returnArguments = firstRoundFunction?.arguments || '{}'
                    if (returnArguments.includes(`: null\n}`)) {
                        returnArguments = returnArguments.replace(`": null\n}`, '').replace(/^{\n\s+"/, '')
                    }
                    console.log(`returnArguments`, returnArguments)
                    const searchText = JSON.parse(returnArguments).searchText
                    const searchResults = await DDG.search(searchText, {
                        safeSearch: DDG.SafeSearchType.OFF,
                        // time: DDG.SearchTimeType.WEEK,
                        // time: "2024-04-01..2024-04-30",
                        locale: 'zh-cn',
                    })
                    console.log(`searchResults by searchText: ${searchText}`, searchResults)
                    // @ts-ignore
                    history.push(firstRoundMessage)
                    history.push({
                        // @ts-ignore
                        role: 'tool',
                        // @ts-ignore
                        tool_call_id: firstRoundMessage?.tool_calls?.[0]?.id,
                        name: firstRoundFunction?.name,
                        content: _.map(
                            searchResults.results.splice(0, 10),
                            (result, index) =>
                                `${index + 1}. title: ${result.title}\n description: ${result.description}`
                        ).join('\n\n'),
                    })

                    const secondResult = await openai.chat.completions.create({
                        model: modelUse,
                        max_tokens,
                        temperature: 0,
                        // @ts-ignore
                        messages: history,
                    })

                    msg = secondResult?.choices?.[0]?.message?.content || ''
                } else {
                    msg = firstRoundMessage?.content || ''
                }
            }

            const result = await openai.chat.completions.create({
                model: modelUse,
                max_tokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
            })
            msg = result?.choices?.[0]?.message?.content || ''
        } catch (e) {
            console.log(`moonshot error`, e)
            msg = String(e)
        }

        console.log(`Moonshot result`, msg)
        return msg
    }
}

const loaderMoonshot = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderMoonshotArgs = {
        ...ctx.loaderMoonshotArgs,
        [key]: args,
    }

    if (!ctx?.loaderMoonshot) {
        ctx.loaderMoonshot = new DataLoader<string, string>(async keys => {
            console.log(`loaderMoonshot-keys-🐹🐹🐹`, keys)
            try {
                const moonshotAnswerList = await Promise.all(
                    keys.map(key =>
                        fetchMoonshot(ctx, {
                            ...ctx.loaderMoonshotArgs[key],
                        })
                    )
                )
                return moonshotAnswerList
            } catch (e) {
                console.log(`[loaderMoonshot] error: ${e}`)
            }
            return new Array(keys.length || 1).fill({ status: false })
        })
    }
    return ctx.loaderMoonshot
}

export default { fetch: fetchMoonshot, loader: loaderMoonshot }
