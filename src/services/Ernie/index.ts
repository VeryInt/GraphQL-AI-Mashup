// import 'dotenv/config'
import ErnieDal from '../../dal/Ernie'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        Ernie(params: ErnieArgs): ChatResult
        ErnieStream(params: ErnieArgs): [String]
    }

    input ErnieArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "Secret_Key"
        secretKey: String
        "Model Name"
        model: String
    }
`

const resolvers = {
    Chat: {
        Ernie: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const ernieArgs = args?.params || {}
            const { messages: appendMessages, apiKey, secretKey, model } = ernieArgs || {}
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (
                await ErnieDal.loader(context, { messages, apiKey, secretKey, model }, key)
            ).load(key)
            return { text }
        },
        ErnieStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const ernieArgs = args?.params || {}
                const { messages: appendMessages, apiKey, secretKey, model } = ernieArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await ErnieDal.loader(
                        context,
                        {
                            messages,
                            apiKey,
                            secretKey,
                            model,
                            isStream: true,
                            completeHandler: ({ content, status }) => {
                                stop()
                            },
                            streamhandler: ({ token, status }) => {
                                console.log(`streamHandle`, token)
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
