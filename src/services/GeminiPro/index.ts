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
        key: String
    }
`

const resolvers = {
    Chat: {
        GeminiPro: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const basePrompt = chatArgs.prompt || ''
            const geminiProArgs = args?.params || {}
            console.log(`parent in geminiPro`, parent)
            const appendPrompt = geminiProArgs.appendPrompt || ''

            const prompt = `${basePrompt} ${appendPrompt}`

            // const text = await runChat(basePrompt)
            const text: any = await (await GeminiProDal.loader(context, { prompt: basePrompt })).load('all')
            return { text }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
