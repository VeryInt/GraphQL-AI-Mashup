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
        "Max Tokens"
        maxTokens: Int
        "BaseUrl"
        baseUrl: String
    }
`
export const Openai = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const { messages: baseMessages, maxTokens: baseMaxTokens, searchWeb } = parent || {}
    const openaiArgs = args?.params || {}
    const { messages: appendMessages, apiKey, model, maxTokens, baseUrl } = openaiArgs || {}
    const maxTokensUse = maxTokens || baseMaxTokens
    const messages = _.concat([], baseMessages || [], appendMessages || []) || []
    const key = messages.at(-1)?.content
    console.log(`key`, key)
    if (!key) {
        return { text: '' }
    }
    const text: any = await (
        await OpenaiDal.loader(
            context,
            { messages, apiKey, model, maxOutputTokens: maxTokensUse, searchWeb, baseUrl },
            key
        )
    ).load(key)
    return { text }
}

export const OpenaiStream = async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
    const xvalue = new Repeater<String>(async (push, stop) => {
        const { messages: baseMessages, maxTokens: baseMaxTokens, searchWeb } = parent || {}
        const openaiArgs = args?.params || {}
        const { messages: appendMessages, apiKey, model, maxTokens, baseUrl } = openaiArgs || {}
        const maxTokensUse = maxTokens || baseMaxTokens
        const messages = _.concat([], baseMessages || [], appendMessages || []) || []
        const key = `${messages.at(-1)?.content || ''}_stream`

        await (
            await OpenaiDal.loader(
                context,
                {
                    messages,
                    apiKey,
                    model,
                    maxOutputTokens: maxTokensUse,
                    isStream: true,
                    searchWeb,
                    baseUrl,
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
        Openai,
        OpenaiStream,
    },
}

export default {
    typeDefinitions,
    resolvers,
}
