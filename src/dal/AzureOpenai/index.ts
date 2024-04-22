// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import { OpenAIClient, AzureKeyCredential } from '@azure/openai'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'

const DEFAULT_MODEL_NAME = 'gpt-35-turbo' // deploymentId

const convertMessages = (messages: ICommonDalArgs['messages']) => {
    let history = _.map(messages, message => {
        return {
            role: message.role == Roles.model ? Roles.assistant : message.role,
            content: message.content,
        }
    })
    return {
        history: history,
    }
}

const fetchAzureOpenai = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        endpoint,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
    } = params || {}
    const ENDPOINT = endpoint || process?.env?.AZURE_OPENAI_ENDPOINT || ''
    const API_KEY = apiKey || process?.env?.AZURE_OPENAI_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Openai'
    }
    const { history } = convertMessages(messages)

    const client = new OpenAIClient(ENDPOINT, new AzureKeyCredential(API_KEY))

    console.log(`isStream`, isStream)

    if (isStream) {
        // try {
        //     const completion = await client.streamChatCompletions(modelUse, history, {
        //         maxTokens: max_tokens,
        //     })
        //     let content = ``
        //     for await (const chunk of completion) {
        //         const text = chunk.choices?.[0]?.delta?.content || ``
        //         console.log(`Azure Openai text`, text)
        //         if (text) {
        //             streamHandler({
        //                 token: text,
        //                 status: true,
        //             })
        //             content += text
        //         }
        //     }
        //     completeHandler({
        //         content: content,
        //         status: true,
        //     })
        // } catch (e) {
        //     console.log(`Azure Openai error`, e)
        //     completeHandler({
        //         content: '',
        //         status: false,
        //     })
        // }
    } else {
        let msg = ''
        try {
            const result = await client.getChatCompletions(modelUse, history, {
                maxTokens: max_tokens,
            })
            msg = result?.choices?.[0]?.message?.content || ''
        } catch (e) {
            console.log(`azure openai error`, e)
            msg = String(e)
        }

        console.log(`Azure Openai result`, msg)
        return msg
    }
}

const loaderAzureOpenai = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderAzureOpenaiArgs = {
        ...ctx.loaderAzureOpenaiArgs,
        [key]: args,
    }

    if (!ctx?.loaderAzureOpenai) {
        ctx.loaderAzureOpenai = new DataLoader<string, string>(async keys => {
            console.log(`loaderAzureOpenai-keys-🐹🐹🐹`, keys)
            try {
                const azureOpenaiAnswerList = await Promise.all(
                    keys.map(key =>
                        fetchAzureOpenai(ctx, {
                            ...ctx.loaderAzureOpenaiArgs[key],
                        })
                    )
                )
                return azureOpenaiAnswerList
            } catch (e) {
                console.log(`[loaderOpenai] error: ${e}`)
            }
            return new Array(keys.length || 1).fill({ status: false })
        })
    }
    return ctx.loaderAzureOpenai
}

export default { fetch: fetchAzureOpenai, loader: loaderAzureOpenai }
