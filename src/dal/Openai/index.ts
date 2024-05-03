// import 'dotenv/config'
import DataLoader from 'dataloader'
import { IOpenaiArgs, Roles, IMessage } from '../../types'
import OpenAI from 'openai'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import { getInternetSerchResult } from '../../utils/tools'
import { searchWebSystemMessage, searchWebTool } from '../../utils/constants'

const availableFunctions: Record<string, any> = {
    get_internet_serch_result: getInternetSerchResult,
}

const DEFAULT_MODEL_NAME = 'gpt-3.5-turbo'

const convertMessages = (messages: IOpenaiArgs['messages']): { history: IMessage[] } => {
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

const fetchOpenai = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
        searchWeb,
        baseUrl,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.OPENAI_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Openai'
    }
    const { history } = convertMessages(messages)
    const openai = new OpenAI({
        apiKey: API_KEY,
        baseURL: baseUrl || undefined,
    })

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
                console.log(`Openai text`, text)
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
            console.log(`Openai error`, e)

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
                console.log(`firstRoundMessage`, firstRoundMessage)
                if (firstRoundMessage?.tool_calls && !_.isEmpty(firstRoundMessage.tool_calls)) {
                    //     console.log(`firstRoundMessage`, firstRoundMessage)
                    // @ts-ignore
                    history.push(firstRoundMessage)
                    //     for (const toolCall of firstRoundMessage.toolCalls as ChatCompletionsFunctionToolCall[]) {
                    //         const { name: functionName, arguments: funArgs } = toolCall.function || {}
                    //         const functionToCall = availableFunctions[functionName]
                    //         const functionArgs = JSON.parse(funArgs?.match(/\{(?:[^{}]*)*\}/g)?.[0] || '{}')
                    //         console.log(`functionArgs`, functionArgs)
                    //         const functionResponse = await functionToCall(functionArgs.searchText, functionArgs.count)
                    //         history.push({
                    //             toolCallId: toolCall.id,
                    //             // @ts-ignore
                    //             role: 'tool',
                    //             name: functionName,
                    //             content: functionResponse,
                    //         })
                    //     }
                    //     const secondResult = await client.getChatCompletions(modelUse, history, {
                    //         maxTokens: max_tokens,
                    //     })

                    //     msg = secondResult?.choices?.[0]?.message?.content || ''
                } else {
                    msg = firstRoundResult?.choices?.[0]?.message?.content || ''
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
            console.log(`openai error`, e)
            msg = String(e)
        }

        console.log(`Openai result`, msg)
        return msg
    }
}

const loaderOpenai = async (ctx: TBaseContext, args: IOpenaiArgs, key: string) => {
    ctx.loaderOpenaiArgs = {
        ...ctx.loaderOpenaiArgs,
        [key]: args,
    }

    if (!ctx?.loaderOpenai) {
        ctx.loaderOpenai = new DataLoader<string, string>(
            async keys => {
                console.log(`loaderOpenai-keys-🐹🐹🐹`, keys)
                try {
                    const openaiAnswerList = await Promise.all(
                        keys.map(key =>
                            fetchOpenai(ctx, {
                                ...ctx.loaderOpenaiArgs[key],
                            })
                        )
                    )
                    return openaiAnswerList
                } catch (e) {
                    console.log(`[loaderOpenai] error: ${e}`)
                }
                return new Array(keys.length || 1).fill({ status: false })
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderOpenai
}

export default { fetch: fetchOpenai, loader: loaderOpenai }
