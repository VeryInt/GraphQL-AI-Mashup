import 'dotenv/config'
import DataLoader from 'dataloader'
import { IGeminiProArgs } from '../../types'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

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

const fetchGeminiPro = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {

    const { prompt, apiKey, model: modelName } = params || {}
    const API_KEY = apiKey || process?.env?.GEMINI_PRO_API_KEY || ''
    if (!prompt || !API_KEY) {
        return ''
    }

    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: modelName || DEFAULT_MODEL_NAME })
    const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [],
    })

    const result = await chat.sendMessage(prompt)
    const response = result.response
    console.log(response.text())
    return response.text()
}

const loaderGeminiPro = async (ctx: TBaseContext, args: IGeminiProArgs, key: string) => {
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
                    ))
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
