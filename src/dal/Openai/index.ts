// import 'dotenv/config'
import DataLoader from 'dataloader'
import { IOpenaiArgs, Roles, IMessage } from '../../types'
import OpenAI from 'openai'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'

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
        baseURL: baseUrl || '',
    })

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
            const result = await openai.chat.completions.create({
                model: modelUse,
                max_tokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
            })
            msg = result?.choices?.[0]?.message?.content || ''
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
        ctx.loaderOpenai = new DataLoader<string, string>(async keys => {
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
        })
    }
    return ctx.loaderOpenai
}

export default { fetch: fetchOpenai, loader: loaderOpenai }
