// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import { fetchEventStream } from '../../utils/tools'

const defaultErrorInfo = `currently the mode is not supported`
const DEFAULT_MODEL_NAME = 'qwen-turbo'
const requestUrl = `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`

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

const fetchQwen = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || {}
    const API_KEY = apiKey || env?.QWEN_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens

    if (_.isEmpty(messages) || !API_KEY) {
        return 'there is no messages or api key of Qwen'
    }
    const { history } = convertMessages(messages)
    console.log(`isStream`, isStream)

    // https://help.aliyun.com/document_detail/2712576.html?spm=a2c4g.2712581.0.0.1e2e55a1x4dFmY
    const body = {
        model: modelUse,
        input: { messages: history },
        parameters: {
            max_tokens,
            result_format: 'message',
        },
    }

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
    }

    console.log(`requestOptions`, requestOptions)
    if (isStream) {
        requestOptions.headers.Accept = `text/event-stream`
        let totalContent = ``
        try {
            fetchEventStream({
                url: requestUrl,
                options: requestOptions,
                regex: /^.*?data:/gs,
                completeHandler: () => {
                    console.log(`totalContent`, totalContent)
                    completeHandler({
                        content: `closed`,
                        status: true,
                    })
                },
                streamHandler: data => {
                    const resultJson = JSON.parse(data)
                    // qwen的sse是每次新消息返回的内容是全部拼接在一起的
                    const newContent = resultJson?.output?.choices?.[0]?.message?.content || ``
                    const token = newContent.replace(totalContent, '')
                    totalContent = newContent
                    console.log(`token`, token)
                    if (token) {
                        streamHandler({
                            token,
                            status: true,
                        })
                    }
                },
            })
        } catch (e) {
            console.log(`ernie error`, e)
            streamHandler({
                token: defaultErrorInfo,
                status: true,
            })
            completeHandler({
                content: defaultErrorInfo,
                status: false,
            })
        }
    } else {
        let msg = ''
        try {
            const response = await fetch(requestUrl, requestOptions)
            const result = await response.json()
            console.log(`fetchQwen`, result)
            msg = result?.output?.choices?.[0]?.message?.content || ``
        } catch (e) {
            console.log(`qwen error`, e)
            msg = String(e)
        }
        return msg
    }
}

const loaderQwen = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderQwenArgs = {
        ...ctx.loaderQwenArgs,
        [key]: args,
    }

    if (!ctx?.loaderQwen) {
        ctx.loaderQwen = new DataLoader<string, string>(async keys => {
            console.log(`loaderQwen-keys-🐹🐹🐹`, keys)
            try {
                const qwenAnswerList = await Promise.all(
                    keys.map(key =>
                        fetchQwen(ctx, {
                            ...ctx.loaderQwenArgs[key],
                        })
                    )
                )
                return qwenAnswerList
            } catch (e) {
                console.log(`[loaderQwen] error: ${e}`)
            }
            return new Array(keys.length || 1).fill({ status: false })
        })
    }
    return ctx.loaderQwen
}

export default { fetch: fetchQwen, loader: loaderQwen }
