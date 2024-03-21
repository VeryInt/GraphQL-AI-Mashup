import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import 'dotenv/config'

const MODEL_NAME = 'gemini-1.0-pro'

async function runChat(prompt: string) {
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

const typeDefinitions = `
    scalar JSON
    type Chat {
        GeminiPro(params: GeminiProArgs): ChatResult
    }

    input GeminiProArgs {
        appendPrompt: String
        "API_KEY"
        key: String
    }
`

const resolvers = {
    Chat: {
        GeminiPro: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const prompt = chatArgs.prompt || ''
            const geminiProArgs = args?.params || {}
            console.log(`parent in geminiPro`, parent)
            const appendPrompt = geminiProArgs.appendPrompt || ''

            const promptRequest = `${prompt} ${appendPrompt}`

            const text = await runChat(promptRequest)
            return { text }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
