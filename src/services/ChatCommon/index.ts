const typeDefinitions = `
    scalar JSON
    type Query {
        chat(params: ChatArgs): Chat
    }

    type Chat {
        JSON: JSON
    }
    type ChatResult {
        text: String!
    }

    input Message {
        role: String!
        content: String!
    }

    input ChatArgs {
        "Request Message List"
        messages: [Message]
        "Max Tokens"
        maxTokens: Int
        "Need Search Internet"
        searchWeb: Boolean
    }
`

const resolvers = {
    Query: {
        chat: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = args.params
            return {
                ...chatArgs,
            }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
