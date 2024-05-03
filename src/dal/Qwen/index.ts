// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles, IMessage } from '../../types'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import { fetchEventStream } from '../../utils/tools'
import { getInternetSerchResult } from '../../utils/tools'
import { searchWebSystemMessage, searchWebTool } from '../../utils/constants'

const defaultErrorInfo = `currently the mode is not supported`
const DEFAULT_MODEL_NAME = 'qwen-turbo'
const requestUrl = `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`

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

const fetchQwen = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
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
    const API_KEY = apiKey || env?.QWEN_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens

    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Qwen'
    }
    const { history } = convertMessages(messages)
    console.log(`isStream`, isStream)
    let tools: any[] = []

    // https://help.aliyun.com/document_detail/2712576.html?spm=a2c4g.2712581.0.0.1e2e55a1x4dFmY
    const body = {
        model: modelUse,
        input: { messages: history },
        parameters: {
            max_tokens,
            result_format: 'message',
        },
    }

    if (searchWeb) {
        history.unshift(searchWebSystemMessage)
        tools = [searchWebTool]
        body.input.messages = history
        // @ts-ignore
        body.parameters.tools = tools
    }

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
    }

    console.log(`requestOptions`, requestOptions)
    if (isStream) {
        requestOptions.headers.Accept = `text/event-stream`
        let totalContent = ``
        let message: Record<string, any>
        try {
            fetchEventStream({
                url: requestUrl,
                options: requestOptions,
                regex: /^.*?data:/gs,
                completeHandler: async () => {
                    console.log(`totalContent`, totalContent)
                    if (searchWeb && message?.output?.choices) {
                        const firstRoundChoices = message.output.choices
                        const needTools = _.filter(firstRoundChoices, r => r.finish_reason == `tool_calls`)
                        if (needTools?.length) {
                            for (const toolChoice of needTools) {
                                const tool_calls = toolChoice?.message?.tool_calls
                                if (tool_calls?.length) {
                                    history.push(toolChoice?.message)
                                    for (const toolCall of tool_calls) {
                                        console.log(`toolCall`, toolCall)
                                        const { name: functionName, arguments: funArgs } = toolCall.function || {}
                                        const functionToCall = availableFunctions[functionName]
                                        const functionArgs = JSON.parse(funArgs?.match(/\{(?:[^{}]*)*\}/g)?.[0] || '{}')
                                        streamHandler({
                                            token: `正在查询 ${functionArgs.searchText}...`,
                                            status: true,
                                        })
                                        const functionResponse = await functionToCall(
                                            functionArgs.searchText,
                                            functionArgs.count
                                        )
                                        history.push({
                                            toolCallId: toolCall.id,
                                            // @ts-ignore
                                            role: 'tool',
                                            name: functionName,
                                            content: functionResponse,
                                        })
                                    }
                                }
                            }
                            fetchEventStream({
                                url: requestUrl,
                                options: {
                                    ...requestOptions,
                                    body: JSON.stringify({
                                        ...body,
                                        parameters: {
                                            ...body.parameters,
                                            tools: undefined,
                                        },
                                        input: {
                                            messages: history,
                                        },
                                    }),
                                },
                                regex: /^.*?data:/gs,
                                completeHandler: () => {
                                    completeHandler({
                                        content: `closed`,
                                        status: true,
                                    })
                                },
                                streamHandler: data => {
                                    const resultJson = JSON.parse(data)
                                    message = resultJson
                                    // qwen的sse是每次新消息返回的内容是全部拼接在一起的
                                    const newContent = resultJson?.output?.choices?.[0]?.message?.content || ``
                                    const token = newContent.replace(totalContent, '')
                                    totalContent = newContent
                                    console.log(`token`, token)
                                    if (token) {
                                        streamHandler({
                                            token,
                                            status: true,
                                        })
                                    }
                                },
                            })
                        }
                    } else {
                        completeHandler({
                            content: `closed`,
                            status: true,
                        })
                    }
                },
                streamHandler: data => {
                    const resultJson = JSON.parse(data)
                    message = resultJson
                    // qwen的sse是每次新消息返回的内容是全部拼接在一起的
                    const newContent = resultJson?.output?.choices?.[0]?.message?.content || ``
                    const token = newContent.replace(totalContent, '')
                    totalContent = newContent
                    console.log(`token`, token)
                    if (token) {
                        streamHandler({
                            token,
                            status: true,
                        })
                    }
                },
            })
        } catch (e) {
            console.log(`ernie error`, e)
            streamHandler({
                token: defaultErrorInfo,
                status: true,
            })
            completeHandler({
                content: defaultErrorInfo,
                status: false,
            })
        }
    } else {
        let msg = ''

        try {
            if (searchWeb) {
                const firstRoundResponse = await fetch(requestUrl, requestOptions)
                const firstRoundResult = await firstRoundResponse.json()
                const firstRoundChoices = firstRoundResult?.output?.choices
                console.log(`firstRoundChoices`, firstRoundChoices)
                const needTools = _.filter(firstRoundChoices, r => r.finish_reason == `tool_calls`)
                if (needTools?.length) {
                    for (const toolChoice of needTools) {
                        const tool_calls = toolChoice?.message?.tool_calls
                        if (tool_calls?.length) {
                            history.push(toolChoice?.message)
                            for (const toolCall of tool_calls) {
                                console.log(`toolCall`, toolCall)
                                const { name: functionName, arguments: funArgs } = toolCall.function || {}
                                const functionToCall = availableFunctions[functionName]
                                const functionArgs = JSON.parse(funArgs?.match(/\{(?:[^{}]*)*\}/g)?.[0] || '{}')
                                const functionResponse = await functionToCall(
                                    functionArgs.searchText,
                                    functionArgs.count
                                )
                                history.push({
                                    toolCallId: toolCall.id,
                                    // @ts-ignore
                                    role: 'tool',
                                    name: functionName,
                                    content: functionResponse,
                                })
                            }
                        }
                    }
                    const secondRoundResponse = await fetch(requestUrl, {
                        ...requestOptions,
                        body: JSON.stringify({
                            ...body,
                            parameters: {
                                ...body.parameters,
                                tools: undefined,
                            },
                            input: {
                                messages: history,
                            },
                        }),
                    })
                    const secondRoundResult = await secondRoundResponse.json()
                    msg = secondRoundResult?.output?.choices?.[0]?.message?.content || ``
                } else {
                    msg = firstRoundChoices?.[0]?.message?.content || ``
                }
            } else {
                const response = await fetch(requestUrl, requestOptions)
                const result = await response.json()
                console.log(`fetchQwen`, result)
                msg = result?.output?.choices?.[0]?.message?.content || ``
            }
        } catch (e) {
            console.log(`qwen error`, e)
            msg = String(e)
        }
        return msg
    }
}

const loaderQwen = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderQwenArgs = {
        ...ctx.loaderQwenArgs,
        [key]: args,
    }

    if (!ctx?.loaderQwen) {
        ctx.loaderQwen = new DataLoader<string, string>(
            async keys => {
                console.log(`loaderQwen-keys-🐹🐹🐹`, keys)
                try {
                    const qwenAnswerList = await Promise.all(
                        keys.map(key =>
                            fetchQwen(ctx, {
                                ...ctx.loaderQwenArgs[key],
                            })
                        )
                    )
                    return qwenAnswerList
                } catch (e) {
                    console.log(`[loaderQwen] error: ${e}`)
                }
                return new Array(keys.length || 1).fill({ status: false })
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderQwen
}

export default { fetch: fetchQwen, loader: loaderQwen }
