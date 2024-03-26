// import 'dotenv/config'
import ClaudeDal from '../../dal/Claude'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        Claude(params: ClaudeArgs): ChatResult
        ClaudeStream(params: ClaudeArgs): [String]
    }

    input ClaudeArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "Model Name"
        model: String
    }
`

const resolvers = {
    Chat: {
        Claude: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = parent?.chatArgs || {}
            const baseMessages = chatArgs.messages || []
            const claudeArgs = args?.params || {}
            const { messages: appendMessages, apiKey } = claudeArgs || {}
            const messages = _.concat([], baseMessages || [], appendMessages || []) || []
            const key = messages.at(-1)?.content
            console.log(`key`, key)
            if (!key) {
                return { text: '' }
            }
            const text: any = await (await ClaudeDal.loader(context, { messages, apiKey }, key)).load(key)
            return { text }
        },
        ClaudeStream: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const xvalue = new Repeater<String>(async (push, stop) => {
                const chatArgs = parent?.chatArgs || {}
                const baseMessages = chatArgs.messages || []
                const claudeArgs = args?.params || {}
                const { messages: appendMessages, apiKey } = claudeArgs || {}
                const messages = _.concat([], baseMessages || [], appendMessages || []) || []
                const key = `${messages.at(-1)?.content || ''}_stream`

                await (
                    await ClaudeDal.loader(
                        context,
                        {
                            messages,
                            apiKey,
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
