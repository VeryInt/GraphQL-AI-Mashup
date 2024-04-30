// import 'dotenv/config'
import AzureOpenaiDal from '../../dal/AzureOpenai'
import _ from 'lodash'
import { Repeater } from 'graphql-yoga'

const typeDefinitions = `
    scalar JSON
    type Chat {
        AzureOpenai(params: AzureOpenaiArgs): ChatResult
        AzureOpenaiStream(params: AzureOpenaiArgs): [String]
    }

    input AzureOpenaiArgs {
        messages: Message
        "API_KEY"
        apiKey: String
        "ENDPOINT"
        endpoint: String
        "Model Name"
        model: String
        "Max Tokens"
        maxTokens: Int
    }
`
export const AzureOpenai = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const { messages: baseMessages, maxTokens: baseMaxTokens, searchWeb } = parent || {}
    const azureOpenaiArgs = args?.params || {}
    const { messages: appendMessages, apiKey, model, maxTokens, endpoint } = azureOpenaiArgs || {}
    const maxTokensUse = maxTokens || baseMaxTokens
    const messages = _.concat([], baseMessages || [], appendMessages || []) || []
    const key = messages.at(-1)?.content
    console.log(`key`, key)
    if (!key) {
        return { text: '' }
    }
    const text: any = await (
        await AzureOpenaiDal.loader(
            context,
            { messages, apiKey, model, maxOutputTokens: maxTokensUse, endpoint, searchWeb },
            key
        )
    ).load(key)
    return { text }
}

export const AzureOpenaiStream = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const xvalue = new Repeater<String>(async (push, stop) => {
        const { messages: baseMessages, maxTokens: baseMaxTokens, searchWeb } = parent || {}
        const azureOpenaiArgs = args?.params || {}
        const { messages: appendMessages, apiKey, model, maxTokens, endpoint } = azureOpenaiArgs || {}
        const maxTokensUse = maxTokens || baseMaxTokens
        const messages = _.concat([], baseMessages || [], appendMessages || []) || []
        const key = `${messages.at(-1)?.content || ''}_stream`

        await (
            await AzureOpenaiDal.loader(
                context,
                {
                    messages,
                    apiKey,
                    model,
                    maxOutputTokens: maxTokensUse,
                    endpoint,
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
        AzureOpenai,
        AzureOpenaiStream,
    },
}

export default {
    typeDefinitions,
    resolvers,
}
