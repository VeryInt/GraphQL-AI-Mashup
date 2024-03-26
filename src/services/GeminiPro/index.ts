// import 'dotenv/config'
import GeminiProDal from '../../dal/GeminiPro'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        GeminiPro(params: GeminiProArgs): ChatResult
        GeminiProStream(params: GeminiProArgs): [String]
    }

    input GeminiProArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "Model Name"
        model: String
    }
`

const resolvers = {
    Chat: {
        GeminiPro: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const geminiProArgs = args?.params || {}
            const { messages: appendMessages, apiKey, model } = geminiProArgs || {}
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (await GeminiProDal.loader(context, { messages, apiKey, model }, key)).load(key)
            return { text }
        },
        GeminiProStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const geminiProArgs = args?.params || {}
                const { messages: appendMessages, apiKey, model } = geminiProArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await GeminiProDal.loader(
                        context,
                        {
                            messages,
                            apiKey,
                            model,
                            isStream: true,
                            completeHandler: ({ content, status }) => {
                                stop()
                            },
                            streamHanler: ({ token, status }) => {
                                if (token && status) {
                                    push(token)
                                }
                            },
                        },
                        key
                    )
                ).load(key)
            })
            return xvalue
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
