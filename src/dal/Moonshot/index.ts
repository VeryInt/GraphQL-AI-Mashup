// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, IMessage, Roles } from '../../types'
import OpenAI from 'openai'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import { sleep, getInternetSerchResult } from '../../utils/tools'
import { searchWebSystemMessage, searchWebTool } from '../../utils/constants'

const DEFAULT_MODEL_NAME = 'moonshot-v1-8k'
const baseUrl = 'https://api.moonshot.cn/v1'

const availableFunctions: Record<string, any> = {
    get_internet_serch_result: getInternetSerchResult,
}

const convertMessages = (messages: ICommonDalArgs['messages']): { history: IMessage[] } => {
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
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
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
        history.unshift(searchWebSystemMessage)
        tools = [searchWebTool]
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
                if (firstRoundMessage?.tool_calls && !_.isEmpty(firstRoundMessage.tool_calls)) {
                    // @ts-ignore
                    history.push(firstRoundMessage)
                    for (const toolCall of firstRoundMessage.tool_calls) {
                        const { name: functionName, arguments: funArgs } = toolCall.function || {}
                        const functionToCall = availableFunctions[functionName]
                        console.log(`🐹🐹🐹 funArgs`, funArgs?.match(/\{(?:[^{}]*)*\}/g)?.[0])
                        const functionArgs = JSON.parse(funArgs?.match(/\{(?:[^{}]*)*\}/g)?.[0] || '{}')
                        console.log(`functionArgs`, functionArgs)
                        const functionResponse = await functionToCall(functionArgs.searchText, functionArgs.count)
                        history.push({
                            tool_call_id: toolCall.id,
                            // @ts-ignore
                            role: 'tool',
                            name: functionName,
                            content: functionResponse,
                        })
                    }
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
            } else {
                const result = await openai.chat.completions.create({
                    model: modelUse,
                    max_tokens,
                    temperature: 0,
                    // @ts-ignore
                    messages: history,
                })
                msg = result?.choices?.[0]?.message?.content || ''
            }
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
        ctx.loaderMoonshot = new DataLoader<string, string>(
            async keys => {
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
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderMoonshot
}

export default { fetch: fetchMoonshot, loader: loaderMoonshot }
