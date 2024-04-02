// import 'dotenv/config'
import ZhipuDal from '../../dal/Zhipu'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        Zhipu(params: ZhipuArgs): ChatResult
        ZhipuStream(params: ZhipuArgs): [String]
    }

    input ZhipuArgs {
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
        Zhipu: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const zhipuArgs = args?.params || {}
            const { messages: appendMessages, apiKey, model, maxTokens } = zhipuArgs || {}
            const maxTokensUse = maxTokens || chatArgs?.maxTokens
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (
                await ZhipuDal.loader(context, { messages, apiKey, model, maxOutputTokens: maxTokensUse }, key)
            ).load(key)
            return { text }
        },
        ZhipuStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const zhipuArgs = args?.params || {}
                const { messages: appendMessages, apiKey, model } = zhipuArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await ZhipuDal.loader(
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
