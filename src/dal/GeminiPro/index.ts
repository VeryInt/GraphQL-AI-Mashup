import 'dotenv/config'
import DataLoader from 'dataloader'
import { GeminiProArgs } from './type'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const MODEL_NAME = 'gemini-1.0-pro'
const genAI = new GoogleGenerativeAI(process?.env?.GEMINI_PRO_API_KEY || '')
const model = genAI.getGenerativeModel({ model: MODEL_NAME })
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
    const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [],
    })
    const prompt = params.prompt || ``
    if (!prompt) {
        return ''
    }
    const result = await chat.sendMessage(prompt)
    const response = result.response
    console.log(response.text())
    return response.text()
}

const loaderGeminiPro = async (ctx: TBaseContext, args: GeminiProArgs) => {
    let loader = new DataLoader<string, string>(async keys => {
        console.log(`loaderGeminiPro-${keys}-🐹🐹🐹`)
        try {
            const params = {
                ...args,
            }
            const answerText = await fetchGeminiPro(ctx, params)
            return new Array(keys.length || 1).fill(answerText)
        } catch (e) {
            console.log(`[loaderGeminiPro] error: ${e}`)
        }
        return new Array(keys.length || 1).fill({ status: false })
    })

    return loader
}

export default { fetch: fetchGeminiPro, loader: loaderGeminiPro }
