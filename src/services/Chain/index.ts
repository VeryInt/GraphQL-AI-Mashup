import _ from 'lodash'

const typeDefinitions = `
    scalar JSON
    type Query {
        chain(params: ChainArgs!): ChatResult
    }

    input Message {
        role: String!
        content: String!
    }

    input ChainArgs {
        "Request Message List"
        messages: [Message!]!
        "Max Tokens"
        maxTokens: Int
        "AI Service"
        callSequence: [AIModel]
        Claude: ClaudeArgs
        Ernie: ErnieArgs
        GeminiPro: GeminiProArgs
        Moonshot: MoonshotArgs
        Openai: OpenaiArgs
        Qwen: QwenArgs
        Zhipu: ZhipuArgs
        Groq: GroqArgs
        Lingyiwanwu: LingyiwanwuArgs
    }

    enum AIModel {
        Claude
        Ernie
        GeminiPro
        Moonshot
        Openai
        Qwen
        Zhipu
        Groq
        Lingyiwanwu
    }
`

const resolvers = {
    Query: {
        chain: async (parent: TParent, args: Record<string, any>, context: TBaseContext) => {
            const params = args?.params || {}
            const { messages, maxTokens, callSequence } = params
            let invalidateCalls: string[] = []
            if (_.isEmpty(messages)) {
                return {
                    text: `messages is required`,
                }
            }

            if (_.isEmpty(callSequence)) {
                return {
                    text: `callSequence is required`,
                }
            }

            // invalidateCalls = _.filter(callSequence, call => {
            //     if(call && !(params[call])){
            //         return true;
            //     }
            // })

            if (!_.isEmpty(invalidateCalls)) {
                return {
                    text: `${invalidateCalls.join(', ')} is invalid`,
                }
            }
            return {
                text: JSON.stringify(messages),
            }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
