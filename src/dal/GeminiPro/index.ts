// import 'dotenv/config'
import DataLoader from 'dataloader'
import { IGeminiProDalArgs, Roles } from '../../types'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import _ from 'lodash'
import { mergeMessages } from '../../utils/tools'
import { generationConfig } from '../../utils/constants'

const DEFAULT_API_VERSION = 'v1'
const DEFAULT_MODEL_NAME = 'gemini-1.0-pro-latest'

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

const convertMessages = (messages: IGeminiProDalArgs['messages']) => {
    const mergedMessages = mergeMessages(messages)
    let history = _.map(mergedMessages, message => {
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
    let message = mergedMessages?.at(-1)?.content
    return {
        history: history,
        message,
    }
}

const fetchGeminiPro = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
        apiVersion,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.GEMINI_PRO_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Claude of GeminiPro'
    }

    const { message, history } = convertMessages(messages)
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel(
        { model: modelUse },
        {
            apiVersion: apiVersion || DEFAULT_API_VERSION,
        }
    )
    const chat = model.startChat({
        generationConfig: { ...generationConfig, maxOutputTokens: max_tokens },
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
            if (chunkText) {
                streamHandler({
                    token: chunkText,
                    status: true,
                })
                text += chunkText
            }
        }
        completeHandler && completeHandler({ content: text, status: true })
    } else {
        let msg = ''
        try {
            const result = await chat.sendMessage(message)
            const response = result.response
            console.log(response.text())
            msg = response.text()
        } catch (e) {
            msg = String(e)
        }

        return msg
    }
}

const loaderGeminiPro = async (ctx: TBaseContext, args: IGeminiProDalArgs, key: string) => {
    ctx.loaderGeminiProArgs = {
        ...ctx.loaderGeminiProArgs,
        [key]: args,
    }

    if (!ctx?.loaderGeminiPro) {
        ctx.loaderGeminiPro = new DataLoader<string, string>(
            async keys => {
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
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderGeminiPro
}

export default { fetch: fetchGeminiPro, loader: loaderGeminiPro }
