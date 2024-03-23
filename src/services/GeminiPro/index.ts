import 'dotenv/config'
import GeminiProDal from '../../dal/GeminiPro'

const typeDefinitions = `
    scalar JSON
    type Chat {
        GeminiPro(params: GeminiProArgs): ChatResult
    }

    input GeminiProArgs {
        appendPrompt: String
        "API_KEY"
        apiKey: String
    }
`

const resolvers = {
    Chat: {
        GeminiPro: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const basePrompt = chatArgs.prompt || ''
            const geminiProArgs = args?.params || {}
            console.log(`parent in geminiPro`, parent)
            const{ appendPrompt, apiKey } = geminiProArgs || {}

            const prompt = `${basePrompt} ${appendPrompt}`
            const key = prompt
            const text: any = await (await GeminiProDal.loader(context, { prompt, apiKey }, key)).load(key)
            return { text }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
