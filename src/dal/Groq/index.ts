import Groq from 'groq-sdk'
import DataLoader from 'dataloader'
import { ICommonDalArgs, IMessage, Roles } from '../../types'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import * as DDG from 'duck-duck-scrape'
// const DDG = require('duck-duck-scrape');

const DEFAULT_MODEL_NAME = `llama3-70b-8192` // 'mixtral-8x7b-32768'

const convertMessages = (messages: ICommonDalArgs['messages']) => {
    let history = _.map(messages, message => {
        return {
            role: message.role == Roles.model ? Roles.assistant : message.role,
            content: message.content,
        }
    })
    const currentMessage = messages?.at(-1)?.content
    return {
        history: history,
        currentMessage,
    }
}

const fetchGroq = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || {}
    const API_KEY = apiKey || env?.GROQ_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Groq'
    }
    let { history, currentMessage } = convertMessages(messages)
    const groq = new Groq({
        apiKey: API_KEY,
    })

    history.unshift({
        role: Roles.system,
        content: `你是一个具有联网功能的智能助手，如果用户的提问的内容可以通过联网获取更新信息，你就一定会使用 get_internet_serch_result tool 来获取相关联网资料，再根据资料结合用户的提问来回答。`,
    })

    let attachedMessage = currentMessage
    // if(currentMessage){
    //     const searchResults = await DDG.search(currentMessage, {
    //         safeSearch: DDG.SafeSearchType.STRICT,
    //         time: DDG.SearchTimeType.WEEK
    //     });
    //     if(searchResults?.results?.length){
    //         attachedMessage = `您现在是一个具备联网功能的智能助手。我将提供一段来自互联网的文本信息。请根据这段文本以及用户提出的问题来给出回答。如果网络资料中的信息不足以回答用户的问题，请回复说无法提供确切的答案。
    //         网络资料:
    //         ------------------------------------------
    //         ${_.map(searchResults.results.splice(0, 10), result => `${result.title}\n${result.description}`).join('\n\n')}

    //         -------------------------------------------
    //         用户问题:
    //         --------------------------------------------
    //         ${currentMessage}
    //         ---------------------------------------------`
    //     }
    //     console.log(`searchResults`, searchResults)
    // }

    console.log(`isStream`, isStream)

    if (history?.at(-1)?.content && attachedMessage) {
        history!.at(-1)!.content = attachedMessage
    }

    console.log(`history`, history)

    if (isStream) {
        try {
            const completion = await groq.chat.completions.create({
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
                console.log(`Groq text`, text)
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
            console.log(`Groq error`, e)

            completeHandler({
                content: '',
                status: false,
            })
        }
    } else {
        let msg = ''
        try {
            const result = await groq.chat.completions.create({
                model: modelUse,
                max_tokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
                tools: [
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
                                        description: 'The text to search for',
                                    },
                                },
                                required: ['searchText'],
                            },
                        },
                    },
                ],
                // @ts-ignore
                tool_choice: 'auto',
                // tool_choice: {
                //     toolChoice: {
                //         function: {name: "get_internet_serch_result"},
                //     }
                // }
            })
            console.log(`result`, result?.choices?.[0].message?.tool_calls?.[0])
            if (result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.name === 'get_internet_serch_result') {
                const searchText = JSON.parse(
                    result?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{}'
                ).searchText
                const searchResults = await DDG.search(searchText, {
                    safeSearch: DDG.SafeSearchType.OFF,
                    // time: DDG.SearchTimeType.WEEK,
                    // time: "2024-04-01..2024-04-30",
                    locale: 'zh-cn',
                })
                console.log(`searchResults by searchText: ${searchText}`, searchResults)
                // const searchResults = { results: [{ title: ``, description: `` }] }
                // @ts-ignore
                history.push(result?.choices?.[0].message)
                history.push({
                    // @ts-ignore
                    role: 'tool',
                    // @ts-ignore
                    tool_call_id: result?.choices?.[0].message?.tool_calls?.[0]?.id,
                    name: result?.choices?.[0].message?.tool_calls?.[0]?.function?.name,
                    content: _.map(
                        searchResults.results.splice(0, 10),
                        (result, index) => `${index + 1}. title: ${result.title}\n description: ${result.description}`
                    ).join('\n\n'),
                })

                // console.log(`latest history`, history)
                const newResult = await groq.chat.completions.create({
                    model: modelUse,
                    max_tokens,
                    temperature: 0,
                    // @ts-ignore
                    messages: history,
                })

                msg = newResult?.choices?.[0]?.message?.content || ''
            } else {
                msg = result?.choices?.[0]?.message?.content || ''
            }
        } catch (e) {
            console.log(`groq error`, e)
            msg = String(e)
        }

        console.log(`Groq result`, msg)
        return msg
    }
}

const loaderGroq = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderGroqArgs = {
        ...ctx.loaderGroqArgs,
        [key]: args,
    }

    if (!ctx?.loaderGroq) {
        ctx.loaderGroq = new DataLoader<string, string>(async keys => {
            console.log(`loaderGroq-keys-🐹🐹🐹`, keys)
            try {
                const groqAnswerList = await Promise.all(
                    keys.map(key =>
                        fetchGroq(ctx, {
                            ...ctx.loaderGroqArgs[key],
                        })
                    )
                )
                return groqAnswerList
            } catch (e) {
                console.log(`[loaderGroq] error: ${e}`)
            }
            return new Array(keys.length || 1).fill({ status: false })
        })
    }
    return ctx.loaderGroq
}

export default { fetch: fetchGroq, loader: loaderGroq }
