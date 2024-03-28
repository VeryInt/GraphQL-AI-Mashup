// import 'dotenv/config'
import DataLoader from 'dataloader'
import { IErnieDalArgs, Roles } from '../../types'
import _ from 'lodash'
const qs = require('qs')

const defaultErrorInfo = `currently the mode is not supported`

const DEFAULT_MODEL_NAME = 'ernie-3.5-4k-0205'
const baseHost = 'https://aip.baidubce.com'
const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1024,
}

const convertMessages = (messages: IErnieDalArgs['messages']) => {
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

const getAccessToken = async ({ apiKey, secretKey }: { apiKey?: string; secretKey?: string }) => {
    let accessToken = ''
    secretKey = secretKey || process?.env?.ERNIE_SECRET_KEY || ''
    apiKey = apiKey || process?.env?.ERNIE_API_KEY || ''
    if (!secretKey || !apiKey) return ''

    let url = `${baseHost}/oauth/2.0/token?`
    const query = {
        grant_type: `client_credentials`,
        client_id: apiKey,
        client_secret: secretKey,
    }
    url = url + qs.stringify(query)
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
        })
        const result = await response.json()
        accessToken = result?.access_token || ``
    } catch (e) {
        console.log(e)
    }
    console.log(`accessToken`, accessToken)
    return accessToken
}

const fetchErnie = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const { messages, apiKey, secretKey, model: modelName, isStream, completeHandler, streamHanler } = params || {}
    const API_KEY = apiKey || process?.env?.ERNIE_API_KEY || ''
    const SECRET_KEY = secretKey || process?.env?.ERNIE_SECRET_KEY || ''
    const modelUse = (modelName || DEFAULT_MODEL_NAME).toLowerCase()
    if (_.isEmpty(messages) || !API_KEY || !SECRET_KEY) {
        return 'there is no messages or api key of Ernie'
    }
    const accessToken = await getAccessToken({
        apiKey: API_KEY,
        secretKey: SECRET_KEY,
    })

    const url = `${baseHost}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelUse}?access_token=${accessToken}`

    const { history } = convertMessages(messages)

    let body = {
        messages: history,
        max_output_tokens: generationConfig.maxOutputTokens,
        stream: false,
    }

    console.log(`isStream`, String(isStream))

    if (isStream) {
        try {
            body.stream = true
            const response: Record<string, any> = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            })

            if (response.ok) {
                const reader = response.body.getReader()
                let totalContent = ``
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) {
                        break
                    }

                    // 处理事件数据
                    const utf8String = new TextDecoder('utf-8').decode(value)
                    const dataInString = utf8String.replace(/^data\:/, '')
                    const resultJson = JSON.parse(dataInString)
                    console.log(`resultJson`, resultJson)
                    const token = resultJson?.result || ``
                    if (token) {
                        totalContent += token
                        streamHanler({
                            token,
                            status: true,
                        })
                    }
                }
                completeHandler({
                    content: totalContent,
                    status: true,
                })
            } else {
                const errorMsg = 'Error fetching events:' + response.status
                console.error(errorMsg)
                streamHanler({
                    token: errorMsg || defaultErrorInfo,
                    status: true,
                })
                completeHandler({
                    content: errorMsg || defaultErrorInfo,
                    status: false,
                })
            }
        } catch (e) {
            console.log(`ernie error`, e)
            streamHanler({
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
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            })
            const result = await response.json()

            msg = result?.result
        } catch (e) {
            console.log(`ernie error`, e)
            msg = String(e)
        }
        return msg
    }

    return ''
}

const loaderErnie = async (ctx: TBaseContext, args: IErnieDalArgs, key: string) => {
    ctx.loaderErnieArgs = {
        ...ctx.loaderErnieArgs,
        [key]: args,
    }

    if (!ctx?.loaderErnie) {
        ctx.loaderErnie = new DataLoader<string, string>(async keys => {
            console.log(`loaderErnie-keys-🐹🐹🐹`, keys)
            try {
                const ernieAnswerList = await Promise.all(
                    keys.map(key =>
                        fetchErnie(ctx, {
                            ...ctx.loaderErnieArgs[key],
                        })
                    )
                )
                return ernieAnswerList
            } catch (e) {
                console.log(`[loaderErnie] error: ${e}`)
            }
            return new Array(keys.length || 1).fill({ status: false })
        })
    }
    return ctx.loaderErnie
}

export default { fetch: fetchErnie, loader: loaderErnie }