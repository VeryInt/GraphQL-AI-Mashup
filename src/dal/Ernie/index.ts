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
    const { messages, apiKey, secretKey, model: modelName, isStream, completeHandler, streamHandler } = params || {}
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
            let totalContent = ``
            body.stream = true
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify(body),
            }

            fetchEventStream({
                url,
                options,
                completeHandler: () => {
                    console.log(`totalContent`, totalContent)
                    completeHandler({
                        content: `closed`,
                        status: true,
                    })
                },
                streamHandler: data => {
                    console.log('Event:', data)
                    console.log('-------------')
                    console.log(`msg.data`, data)
                    console.log(`------------------`)
                    const resultJson = eval(`(${data})`)
                    console.log(`resultJson`, resultJson)
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

interface IFetchEventStreamProps {
    url: string
    options: Record<string, any>
    completeHandler: () => void
    streamHandler: (data: any) => void
}
const fetchEventStream = async ({ url, options, completeHandler, streamHandler }: IFetchEventStreamProps) => {
    const response: Record<string, any> = await fetch(url, options)

    const reader = response.body.getReader()
    let eventStreamBuffer = ''

    // 监听流中的数据
    reader.read().then(function processStream({ done, value }: { done: boolean; value: any }) {
        if (done) {
            console.log('Stream complete')
            completeHandler()
            return
        }
        const chunk = new TextDecoder().decode(value) // 解码流中的数据
        eventStreamBuffer += chunk

        // 处理缓冲区中的完整事件
        const completeMessages = eventStreamBuffer.split('\n\n') // 每个事件以两个换行符分隔

        completeMessages.slice(0, -1).forEach(message => {
            const data = message.replace(/^data: /, '') // 删除每个事件前面的“data: ”
            console.log('Received message:', data)
            streamHandler(data)
        })

        // 保存最后一个不完整的消息
        eventStreamBuffer = completeMessages[completeMessages.length - 1]
        console.log(`eventStreamBuffer====>`, eventStreamBuffer)
        // 继续读取下一个数据块
        reader.read().then(processStream)
    })
}
