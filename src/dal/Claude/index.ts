// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import Anthropic from '@anthropic-ai/sdk'
import _ from 'lodash'

const DEFAULT_MODEL_NAME = 'claude-3-haiku-20240307'
const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1024,
}

const convertMessages = (messages: ICommonDalArgs['messages']) => {
    let history = _.map(messages, message => {
        return {
            role:
                message.role == Roles.model
                    ? Roles.assistant
                    : message.role == Roles.system
                      ? Roles.assistant
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
    const { messages, apiKey, model: modelName, isStream, completeHandler, streamHanler } = params || {}
    const API_KEY = apiKey || process?.env?.CLAUDE_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Claude'
    }
    const { history } = convertMessages(messages)
    const anthropic = new Anthropic({
        apiKey: API_KEY,
    })

    if (isStream) {
        await anthropic.messages
            .stream({
                // @ts-ignore
                messages: history,
                model: modelUse,
                max_tokens: generationConfig.maxOutputTokens,
            })
            .on('text', text => {
                console.log(`claude text`, text)
                text &&
                    streamHanler({
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
            const result = await anthropic.messages.create({
                model: modelUse,
                max_tokens: generationConfig.maxOutputTokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
            })
            msg = result?.role == Roles.assistant ? result?.content?.[0]?.text || '' : ''
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
        ctx.loaderClaude = new DataLoader<string, string>(async keys => {
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
        })
    }
    return ctx.loaderClaude
}

export default { fetch: fetchClaude, loader: loaderClaude }
