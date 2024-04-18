import _ from 'lodash'
import { Claude } from '../Claude'

const typeDefinitions = `
    scalar JSON
    type Query {
        chain(params: ChainArgs!): ChainResult
    }

    type ChainResult {
        messages: [OutputMessage]
    }

    type OutputMessage {
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

            for await (const aiService of callSequence) {
                if (aiService === 'Claude') {
                    console.log(`params[aiService]`, params[aiService], messages)
                    const { text } = await Claude({ messages }, params[aiService], context)
                    messages.push({ role: 'assistant', content: text })
                }
            }

            return {
                messages: messages,
            }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
