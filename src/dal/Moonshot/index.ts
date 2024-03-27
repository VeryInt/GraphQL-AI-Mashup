// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import OpenAI from 'openai'
import _ from 'lodash'

const DEFAULT_MODEL_NAME = 'moonshot-v1-8k'
const baseUrl = 'https://api.moonshot.cn/v1'
const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1024,
}

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
    const { messages, apiKey, model: modelName, isStream, completeHandler, streamHanler } = params || {}
    const API_KEY = apiKey || process?.env?.MOONSHOT_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Moonshot'
    }
    const { history } = convertMessages(messages)
    const openai = new OpenAI({
        baseURL: baseUrl,
        apiKey: API_KEY,
    })

    console.log(`isStream`, isStream)

    if (isStream) {
        try {
            const completion = await openai.chat.completions.create({
                model: modelUse,
                max_tokens: generationConfig.maxOutputTokens,
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
                    streamHanler({
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
            const result = await openai.chat.completions.create({
                model: modelUse,
                max_tokens: generationConfig.maxOutputTokens,
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
