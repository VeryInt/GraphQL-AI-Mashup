// import 'dotenv/config'
import DataLoader from 'dataloader'
import { IErnieDalArgs, Roles } from '../../types'
import _ from 'lodash'
const qs = require('qs')
import { fetchEventStream } from '../../utils/tools'
import { generationConfig } from '../../utils/constants'

const defaultErrorInfo = `currently the mode is not supported`

const DEFAULT_MODEL_NAME = 'ernie-3.5-4k-0205'
const baseHost = 'https://aip.baidubce.com'

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
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    secretKey = secretKey || env?.ERNIE_SECRET_KEY || ''
    apiKey = apiKey || env?.ERNIE_API_KEY || ''
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
    const {
        messages,
        apiKey,
        secretKey,
        model: modelName,
        maxOutputTokens,
        isStream,
        completeHandler,
        streamHandler,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.ERNIE_API_KEY || ''
    const SECRET_KEY = secretKey || env?.ERNIE_SECRET_KEY || ''
    const modelUse = (modelName || DEFAULT_MODEL_NAME).toLowerCase()
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY || !SECRET_KEY) {
        return 'there is no messages or api key of Ernie'
    }
    const accessToken = await getAccessToken({
        apiKey: API_KEY,
        secretKey: SECRET_KEY,
    })

    const requestUrl = `${baseHost}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelUse}?access_token=${accessToken}`

    const { history } = convertMessages(messages)

    const body = {
        messages: history,
        max_output_tokens: max_tokens,
        stream: false,
    }
    let requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
        },
        body: JSON.stringify(body),
    }

    console.log(`isStream`, String(isStream))

    if (isStream) {
        try {
            let totalContent = ``
            body.stream = true
            requestOptions.headers.Accept = 'text/event-stream'
            requestOptions.body = JSON.stringify(body)
            const options = requestOptions

            fetchEventStream({
                url: requestUrl,
                options,
                regex: /^data: /,
                completeHandler: () => {
                    console.log(`totalContent`, totalContent)
                    completeHandler({
                        content: `closed`,
                        status: true,
                    })
                },
                streamHandler: data => {
                    const resultJson = JSON.parse(data)
                    const token = resultJson?.result || ``
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
        ctx.loaderErnie = new DataLoader<string, string>(
            async keys => {
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
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderErnie
}

export default { fetch: fetchErnie, loader: loaderErnie }
