// import 'dotenv/config'
import LingyiwanwuDal from '../../dal/Lingyiwanwu'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        Lingyiwanwu(params: LingyiwanwuArgs): ChatResult
        LingyiwanwuStream(params: LingyiwanwuArgs): [String]
    }

    input LingyiwanwuArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "Model Name"
        model: String
        "Max Tokens"
        maxTokens: Int
    }
`

const resolvers = {
    Chat: {
        Lingyiwanwu: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const lingyiwanwuArgs = args?.params || {}
            const { messages: appendMessages, apiKey, model, maxTokens } = lingyiwanwuArgs || {}
            const maxTokensUse = maxTokens || chatArgs?.maxTokens
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (
                await LingyiwanwuDal.loader(context, { messages, apiKey, model, maxOutputTokens: maxTokensUse }, key)
            ).load(key)
            return { text }
        },
        LingyiwanwuStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const lingyiwanwuArgs = args?.params || {}
                const { messages: appendMessages, apiKey, model } = lingyiwanwuArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await LingyiwanwuDal.loader(
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
