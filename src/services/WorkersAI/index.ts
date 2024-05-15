// import 'dotenv/config'
import WorkersAIDal from '../../dal/WorkersAI'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        WorkersAI(params: WorkersAIArgs): ChatResult
        WorkersAIStream(params: WorkersAIArgs): [String]
    }

    input WorkersAIArgs {
        messages: Message
        "Account ID"
        accountID: String
        "API_KEY"
        apiKey: String
        "Model Name"
        model: String
        "Max Tokens"
        maxTokens: Int
    }
`
export const WorkersAI = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const { messages: baseMessages, maxTokens: baseMaxTokens } = parent || {}
    const workersAIArgs = args?.params || {}
    const { messages: appendMessages, apiKey, model, maxTokens, accountID } = workersAIArgs || {}
    const maxTokensUse = maxTokens || baseMaxTokens
    const messages = _.concat([], baseMessages || [], appendMessages || []) || []
    const key = messages.at(-1)?.content
    console.log(`key`, key)
    if (!key) {
        return { text: '' }
    }
    const text: any = await (
        await WorkersAIDal.loader(context, { messages, apiKey, model, maxOutputTokens: maxTokensUse, accountID }, key)
    ).load(key)
    return { text }
}

export const WorkersAIStream = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const xvalue = new Repeater<String>(async (push, stop) => {
        const { messages: baseMessages, maxTokens: baseMaxTokens } = parent || {}
        const workersAIArgs = args?.params || {}
        const { messages: appendMessages, apiKey, model, maxTokens, accountID } = workersAIArgs || {}
        const maxTokensUse = maxTokens || baseMaxTokens
        const messages = _.concat([], baseMessages || [], appendMessages || []) || []
        const key = `${messages.at(-1)?.content || ''}_stream`

        await (
            await WorkersAIDal.loader(
                context,
                {
                    messages,
                    apiKey,
                    model,
                    maxOutputTokens: maxTokensUse,
                    isStream: true,
                    accountID,
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
        WorkersAI,
        WorkersAIStream,
    },
}

export default {
    typeDefinitions,
    resolvers,
}
