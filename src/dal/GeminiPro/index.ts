import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import _ from 'lodash'

const DEFAULT_MODEL_NAME = 'gemini-1.0-pro'
const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
}
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
]

const convertMessages = (messages: ICommonDalArgs['messages']) => {
    let history = _.map(messages, message => {
        return {
            role:
                message.role == Roles.assistant
                    ? Roles.model
                    : message.role == Roles.system
                      ? Roles.model
                      : message.role,
            parts: [{ text: message.content }],
        }
    })

    history.splice(-1)
    let message = messages?.at(-1)?.content
    return {
        history: history,
        message,
    }
}

const fetchGeminiPro = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const { messages, apiKey, model: modelName, isStream, completeHandler, streamHanler } = params || {}
    const API_KEY = apiKey || process?.env?.GEMINI_PRO_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    if (_.isEmpty(messages) || !API_KEY) {
        return ''
    }

    const { message, history } = convertMessages(messages)
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: modelUse })
    const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: history,
    })

    if (!message) return ''

    console.log(`isStream`, isStream)

    if (isStream) {
        const streamResult = await chat.sendMessageStream(message)
        let text = ''
        for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text()
            streamHanler({
                token: chunkText,
                status: true,
            })
            text += chunkText
        }
        completeHandler && completeHandler({ content: text, status: true })
    } else {
        const result = await chat.sendMessage(message)
        const response = result.response
        console.log(response.text())
        return response.text()
    }
}

const loaderGeminiPro = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderGeminiProArgs = {
        ...ctx.loaderGeminiProArgs,
        [key]: args,
    }

    if (!ctx?.loaderGeminiPro) {
        ctx.loaderGeminiPro = new DataLoader<string, string>(async keys => {
            console.log(`loaderGeminiPro-keys-🐹🐹🐹`, keys)
            try {
                const geminiProAnswerList = await Promise.all(
                    keys.map(key =>
                        fetchGeminiPro(ctx, {
                            ...ctx.loaderGeminiProArgs[key],
                        })
                    )
                )
                return geminiProAnswerList
            } catch (e) {
                console.log(`[loaderGeminiPro] error: ${e}`)
            }
            return new Array(keys.length || 1).fill({ status: false })
        })
    }
    return ctx.loaderGeminiPro
}

export default { fetch: fetchGeminiPro, loader: loaderGeminiPro }
