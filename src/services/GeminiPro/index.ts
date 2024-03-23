import 'dotenv/config'
import GeminiProDal from '../../dal/GeminiPro'
import _ from 'lodash'

const typeDefinitions = `
    scalar JSON
    type Chat {
        GeminiPro(params: GeminiProArgs): ChatResult
    }

    input GeminiProArgs {
        messages: Message
        "API_KEY"
        apiKey: String
    }
`

const resolvers = {
    Chat: {
        GeminiPro: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const geminiProArgs = args?.params || {}
            const { messages: appendMessages, apiKey } = geminiProArgs || {}
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (await GeminiProDal.loader(context, { messages, apiKey }, key)).load(key)
            return { text }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
