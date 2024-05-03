// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles, IClaudeMessage } from '../../types'
import Anthropic from '@anthropic-ai/sdk'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import { getInternetSerchResult, mergeMessages } from '../../utils/tools'
import { searchWebSystemMessage, searchWebTool } from '../../utils/constants'

const availableFunctions: Record<string, any> = {
    get_internet_serch_result: getInternetSerchResult,
}

const DEFAULT_MODEL_NAME = 'claude-3-haiku-20240307'

const convertMessages = (messages: ICommonDalArgs['messages']): { history: IClaudeMessage[] } => {
    const mergedMessages = mergeMessages(messages)
    let history = _.map(mergedMessages, message => {
        return {
            role:
                message.role == Roles.model
                    ? Roles.assistant
                    : message.role == Roles.system
                      ? Roles.user
                      : message.role,
            content: [{ type: 'text', text: message.content }],
            // content: message.content,
        }
    })
    return {
        history: history,
    }
}

const fetchClaude = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        maxOutputTokens,
        isStream,
        completeHandler,
        streamHandler,
        searchWeb,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.CLAUDE_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Claude'
    }

    let tools: any[] = []
    if (searchWeb) {
        messages.unshift({
            role: Roles.user,
            content: [{ type: 'text', text: searchWebSystemMessage.content }],
        })
        tools = [
            {
                name: searchWebTool.function.name,
                description: searchWebTool.function.description,
                input_schema: searchWebTool.function.parameters,
            },
        ]
    }

    const { history } = convertMessages(messages)
    const anthropic = new Anthropic({
        apiKey: API_KEY,
    })

    const headers = {
        'X-Api-Key': API_KEY,
        'Anthropic-Version': '2023-06-01',
        'Anthropic-Beta': 'tools-2024-04-04',
        'Content-Type': 'application/json',
    }

    if (isStream) {
        await anthropic.messages
            .stream({
                // @ts-ignore
                messages: history,
                model: modelUse,
                max_tokens,
            })
            .on('text', text => {
                console.log(`claude text`, text)
                text &&
                    streamHandler({
                        status: true,
                        token: text,
                    })
            })
            .on('message', message => {
                console.log(`claude message`, message)
                message &&
                    completeHandler({
                        content: message,
                        status: true,
                    })
            })
            .off('error', error => {
                console.log(`claude off`, error)
                completeHandler({
                    content: '',
                    status: false,
                })
            })
    } else {
        let msg = ''
        try {
            if (searchWeb) {
                const firstRoundResponse = await fetch(`https://api.anthropic.com/v1/messages`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: modelUse,
                        max_tokens,
                        tools,
                        messages: history,
                    }),
                })

                const firstRoundResult = await firstRoundResponse.json()
                const firstRoundContent = firstRoundResult?.content
                // @ts-ignore
                const needTools = _.filter(firstRoundContent, c => c.type == 'tool_use')
                console.log(`firstRoundResult`, firstRoundResult)
                if (needTools?.length) {
                    history.push({
                        role: Roles.assistant,
                        content: firstRoundContent,
                    })
                    for (const tool of needTools) {
                        const { name: functionName, input: funArgs } = tool || {}
                        console.log(`funArgs`, funArgs, typeof funArgs)
                        const functionToCall = availableFunctions[functionName]
                        const functionResponse = await functionToCall(funArgs.searchText, funArgs.count)
                        history.push({
                            role: Roles.user,
                            content: [
                                {
                                    type: 'tool_result',
                                    // @ts-ignore
                                    tool_use_id: tool.id,
                                    content: functionResponse,
                                },
                            ],
                        })
                    }
                    const secondRoundResponse = await fetch(`https://api.anthropic.com/v1/messages`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            model: modelUse,
                            max_tokens,
                            tools,
                            messages: history,
                        }),
                    })
                    const secondRoundResult = await secondRoundResponse.json()
                    console.log(`secondRoundResult`, secondRoundResult)
                    msg = secondRoundResult?.content?.[0]?.text || ``
                    console.log(`msgmsg`, msg)
                } else {
                    msg = firstRoundContent?.[0]?.text || ``
                }
            } else {
                const result = await anthropic.messages.create({
                    model: modelUse,
                    max_tokens,
                    temperature: 0,
                    // @ts-ignore
                    messages: history,
                })
                msg = result?.role == Roles.assistant ? result?.content?.[0]?.text || '' : ''
            }
        } catch (e) {
            msg = String(e)
        }

        console.log(`claude result`, msg)
        return msg
    }
}

const loaderClaude = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderClaudeArgs = {
        ...ctx.loaderClaudeArgs,
        [key]: args,
    }

    if (!ctx?.loaderClaude) {
        ctx.loaderClaude = new DataLoader<string, string>(
            async keys => {
                console.log(`loaderClaude-keys-🐹🐹🐹`, keys)
                try {
                    const geminiProAnswerList = await Promise.all(
                        keys.map(key =>
                            fetchClaude(ctx, {
                                ...ctx.loaderClaudeArgs[key],
                            })
                        )
                    )
                    return geminiProAnswerList
                } catch (e) {
                    console.log(`[loaderClaude] error: ${e}`)
                }
                return new Array(keys.length || 1).fill({ status: false })
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderClaude
}

export default { fetch: fetchClaude, loader: loaderClaude }
