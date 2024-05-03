// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import OpenAI from 'openai'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'

const DEFAULT_MODEL_NAME = 'yi-34b-chat-0205'
const baseUrl = 'https://api.lingyiwanwu.com/v1'

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

const fetchLingyiwanwu = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.LINGYIWANWU_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Lingyiwanwu'
    }
    const { history } = convertMessages(messages)
    const lingyiwanwu = new OpenAI({
        apiKey: API_KEY,
        baseURL: baseUrl,
    })

    console.log(`isStream`, isStream)

    if (isStream) {
        try {
            const completion = await lingyiwanwu.chat.completions.create({
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
                console.log(`Lingyiwanwu text`, text)
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
            console.log(`Lingyiwanwu error`, e)

            completeHandler({
                content: '',
                status: false,
            })
        }
    } else {
        let msg = ''
        try {
            const result = await lingyiwanwu.chat.completions.create({
                model: modelUse,
                max_tokens,
                temperature: 0,
                // @ts-ignore
                messages: history,
            })
            msg = result?.choices?.[0]?.message?.content || ''
        } catch (e) {
            console.log(`lingyiwanwu error`, e)
            msg = String(e)
        }

        console.log(`Lingyiwanwu result`, msg)
        return msg
    }
}

const loaderLingyiwanwu = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderLingyiwanwuArgs = {
        ...ctx.loaderLingyiwanwuArgs,
        [key]: args,
    }

    if (!ctx?.loaderLingyiwanwu) {
        ctx.loaderLingyiwanwu = new DataLoader<string, string>(
            async keys => {
                console.log(`loaderLingyiwanwu-keys-🐹🐹🐹`, keys)
                try {
                    const lingyiwanwuAnswerList = await Promise.all(
                        keys.map(key =>
                            fetchLingyiwanwu(ctx, {
                                ...ctx.loaderLingyiwanwuArgs[key],
                            })
                        )
                    )
                    return lingyiwanwuAnswerList
                } catch (e) {
                    console.log(`[loaderLingyiwanwu] error: ${e}`)
                }
                return new Array(keys.length || 1).fill({ status: false })
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderLingyiwanwu
}

export default { fetch: fetchLingyiwanwu, loader: loaderLingyiwanwu }
