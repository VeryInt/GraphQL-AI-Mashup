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
        "Max Tokens"
        maxTokens: Int
    }
`
export const Claude = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const { messages: baseMessages, maxTokens: baseMaxTokens, searchWeb } = parent || {}
    const claudeArgs = args?.params || {}
    const { messages: appendMessages, apiKey, model, maxTokens } = claudeArgs || {}
    const maxTokensUse = maxTokens || baseMaxTokens
    const messages = _.concat([], baseMessages || [], appendMessages || []) || []
    const key = messages.at(-1)?.content
    console.log(`key`, key)
    if (!key) {
        return { text: '' }
    }
    const text: any = await (
        await ClaudeDal.loader(context, { messages, apiKey, model, maxOutputTokens: maxTokensUse, searchWeb }, key)
    ).load(key)
    return { text }
}

export const ClaudeStream = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const xvalue = new Repeater<String>(async (push, stop) => {
        const { messages: baseMessages, maxTokens: baseMaxTokens, searchWeb } = parent || {}
        const claudeArgs = args?.params || {}
        const { messages: appendMessages, apiKey, model, maxTokens } = claudeArgs || {}
        const maxTokensUse = maxTokens || baseMaxTokens
        const messages = _.concat([], baseMessages || [], appendMessages || []) || []
        const key = `${messages.at(-1)?.content || ''}_stream`

        await (
            await ClaudeDal.loader(
                context,
                {
                    messages,
                    apiKey,
                    model,
                    maxOutputTokens: maxTokensUse,
                    isStream: true,
                    searchWeb,
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
}

const resolvers = {
    Chat: {
        Claude,
        ClaudeStream,
    },
}

export default {
    typeDefinitions,
    resolvers,
}
