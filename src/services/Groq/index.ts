// import 'dotenv/config'
import GroqDal from '../../dal/Groq'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        Groq(params: GroqArgs): ChatResult
        GroqStream(params: GroqArgs): [String]
    }

    input GroqArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "Model Name"
        model: String
    }
`

const resolvers = {
    Chat: {
        Groq: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const groqArgs = args?.params || {}
            const { messages: appendMessages, apiKey, model } = groqArgs || {}
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (await GroqDal.loader(context, { messages, apiKey, model }, key)).load(key)
            return { text }
        },
        GroqStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const groqArgs = args?.params || {}
                const { messages: appendMessages, apiKey, model } = groqArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await GroqDal.loader(
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