// import 'dotenv/config'
import DataLoader from 'dataloader'
import { ICommonDalArgs, Roles } from '../../types'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import { fetchEventStream } from '../../utils/tools'
import { SignJWT } from 'jose'

const defaultErrorInfo = `currently the mode is not supported`
const DEFAULT_MODEL_NAME = 'glm-3-turbo'
const requestUrl = `https://open.bigmodel.cn/api/paas/v4/chat/completions`

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

const getAuthToken = async ({ apiKey }: { apiKey: string }): Promise<string> => {
    const [key, secret] = apiKey?.split('.')
    const now = Date.now()
    let authToken = ''
    const payload = { api_key: key, exp: now + 10000, timestamp: now }
    try {
        authToken = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256', sign_type: 'SIGN' })
            .setExpirationTime('3s')
            .sign(new TextEncoder().encode(secret))
    } catch (e) {
        console.log(`get authToken error`, e)
    }

    return authToken
}

const fetchZhipu = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        model: modelName,
        isStream,
        maxOutputTokens,
        completeHandler,
        streamHandler,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.ZHIPU_API_KEY || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens

    const authToken = await getAuthToken({ apiKey: API_KEY })

    if (_.isEmpty(messages) || !API_KEY || !authToken) {
        if (isStream) {
            streamHandler({
                token: 'there is no messages or api key of Zhipu',
                status: true,
            })
        }
        return 'there is no messages or api key of Zhipu'
    }
    const { history } = convertMessages(messages)
    console.log(`isStream`, isStream)

    const body = {
        model: modelUse,
        messages: history,
        max_tokens,
        stream: false,
    }

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
    }

    console.log(`requestOptions`, requestOptions)
    if (isStream) {
        requestOptions.headers.Accept = `text/event-stream`
        body.stream = true
        requestOptions.body = JSON.stringify(body)
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
                    let resultJson: Record<string, any> = {}
                    try {
                        resultJson = JSON.parse(data)
                    } catch (e) {}
                    const token = resultJson?.choices?.[0]?.delta?.content || ``
                    console.log(`token`, token)
                    if (token) {
                        totalContent += token
                        streamHandler({
                            token,
                            status: true,
                        })
                    }
                },
            })
        } catch (e) {
            console.log(`zhipu error`, e)
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
            console.log(`fetchZhipu`, result)
            msg = result?.choices?.[0]?.message?.content || ``
        } catch (e) {
            console.log(`zhipu error`, e)
            msg = String(e)
        }
        return msg
    }
}

const loaderZhipu = async (ctx: TBaseContext, args: ICommonDalArgs, key: string) => {
    ctx.loaderZhipuArgs = {
        ...ctx.loaderZhipuArgs,
        [key]: args,
    }

    if (!ctx?.loaderZhipu) {
        ctx.loaderZhipu = new DataLoader<string, string>(
            async keys => {
                console.log(`loaderZhipu-keys-🐹🐹🐹`, keys)
                try {
                    const zhipuAnswerList = await Promise.all(
                        keys.map(key =>
                            fetchZhipu(ctx, {
                                ...ctx.loaderZhipuArgs[key],
                            })
                        )
                    )
                    return zhipuAnswerList
                } catch (e) {
                    console.log(`[loaderZhipu] error: ${e}`)
                }
                return new Array(keys.length || 1).fill({ status: false })
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderZhipu
}

export default { fetch: fetchZhipu, loader: loaderZhipu }
