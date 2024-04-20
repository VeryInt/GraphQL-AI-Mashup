import _ from 'lodash'
// import { Claude } from '../Claude'
import { ChainType } from '../../utils/constants'
const { Claude, ClaudeStream } = require('../Claude')
const { Groq } = require('../Groq')
const { GeminiPro } = require('../GeminiPro')
const { Lingyiwanwu } = require('../Lingyiwanwu')
const { Ernie } = require('../Ernie')
const { Moonshot } = require('../Moonshot')

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
        "Chain Type"
        chainType: ChainType
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
        AzureOpenai: AzureOpenaiArgs
        Qwen: QwenArgs
        Zhipu: ZhipuArgs
        Groq: GroqArgs
        Lingyiwanwu: LingyiwanwuArgs
    }

    enum ChainType {
        "Loop Enhance by different AI Services"
        Enhance
        "Assign job to different AI Services"
        Assign
    }
    enum AIModel {
        Claude
        Ernie
        GeminiPro
        Moonshot
        AzureOpenai
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
            const { messages, maxTokens, callSequence, chainType } = params
            let chainMessages = [...messages]
            const chainTypeUse = chainType || ChainType.Enhance
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

            if (chainTypeUse == ChainType.Enhance) {
                try {
                    for await (const aiService of callSequence) {
                        console.log(`aiService`, eval(aiService))
                        if (aiService && typeof eval(aiService) == `function`) {
                            console.log(`params[aiService]`, params[aiService], chainMessages)
                            const { text } = await eval(aiService)(
                                { messages: chainMessages },
                                params[aiService],
                                context
                            )
                            chainMessages.push({ role: 'user', content: text })
                        }
                    }
                } catch (e) {
                    console.log(`Enhance error`, e)
                }
            } else if (chainTypeUse == ChainType.Assign) {
            }

            return {
                messages: chainMessages,
            }
        },
    },
}

export default {
    typeDefinitions,
    resolvers,
}
