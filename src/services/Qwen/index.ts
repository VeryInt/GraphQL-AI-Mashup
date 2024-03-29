// import 'dotenv/config'
import QwenDal from '../../dal/Qwen'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        Qwen(params: QwenArgs): ChatResult
        QwenStream(params: QwenArgs): [String]
    }

    input QwenArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "Model Name"
        model: String
    }
`

const resolvers = {
    Chat: {
        Qwen: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const qwenArgs = args?.params || {}
            const { messages: appendMessages, apiKey, model } = qwenArgs || {}
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (await QwenDal.loader(context, { messages, apiKey, model }, key)).load(key)
            return { text }
        },
        QwenStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const qwenArgs = args?.params || {}
                const { messages: appendMessages, apiKey, model } = qwenArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await QwenDal.loader(
                        context,
                        {
                            messages,
                            apiKey,
                            model,
                            isStream: true,
                            completeHandler: ({ content, status }) => {
                                stop()
                            },
                            streamHandler: ({ token, status }) => {
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
