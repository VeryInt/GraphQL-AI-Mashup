// import 'dotenv/config'
import OpenaiDal from '../../dal/Openai'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        Openai(params: OpenaiArgs): ChatResult
        OpenaiStream(params: OpenaiArgs): [String]
    }

    input OpenaiArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "Model Name"
        model: String
    }
`

const resolvers = {
    Chat: {
        Openai: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const openaiArgs = args?.params || {}
            const { messages: appendMessages, apiKey, model } = openaiArgs || {}
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (await OpenaiDal.loader(context, { messages, apiKey, model }, key)).load(key)
            return { text }
        },
        OpenaiStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const openaiArgs = args?.params || {}
                const { messages: appendMessages, apiKey, model } = openaiArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await OpenaiDal.loader(
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
