const typeDefinitions = `
    scalar JSON
    type Query {
        chat(params: ChatArgs!): Chat
    }

    type Chat {
        JSON: JSON
    }
    type ChatResult {
        text: String!
    }

    input ChatArgs {
        "提问内容"
        prompt: String
    }
`

const resolvers = {
    Query: {
        chat: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const chatArgs = args.params
            return {
                chatArgs,
            }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
