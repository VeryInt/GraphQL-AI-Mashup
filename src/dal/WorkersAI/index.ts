// import 'dotenv/config'
import DataLoader from 'dataloader'
import { IWorkersAIArgs, Roles } from '../../types'
import _ from 'lodash'
import { generationConfig } from '../../utils/constants'
import { fetchEventStream } from '../../utils/tools'

const DEFAULT_MODEL_NAME = '@cf/meta/llama-3-8b-instruct'
const baseUrl = `https://api.cloudflare.com/client/v4/accounts/`
const defaultErrorInfo = `currently the mode is not supported`

const convertMessages = (messages: IWorkersAIArgs['messages']) => {
    let history = _.map(messages, message => {
        return {
            role:
                message.role == Roles.model
                    ? Roles.assistant
                    : message.role == Roles.system
                      ? Roles.assistant
                      : message.role,
            content: message.content,
        }
    })
    return {
        history: history,
    }
}

const fetchWorkersAI = async (ctx: TBaseContext, params: Record<string, any>, options: Record<string, any> = {}) => {
    const {
        messages,
        apiKey,
        accountID,
        model: modelName,
        maxOutputTokens,
        isStream,
        completeHandler,
        streamHandler,
    } = params || {}
    const env = (typeof process != 'undefined' && process?.env) || ({} as NodeJS.ProcessEnv)
    const API_KEY = apiKey || env?.WORKERSAI_API_KEY || ''
    const ACCOUNT_ID = accountID || env?.WORKERSAI_ACCOUNT_ID || ''
    const modelUse = modelName || DEFAULT_MODEL_NAME
    const max_tokens = maxOutputTokens || generationConfig.maxOutputTokens
    if (_.isEmpty(messages) || !API_KEY || !ACCOUNT_ID) {
        return 'there is no messages or api key of WorkersAI'
    }
    const { history } = convertMessages(messages)

    const body = {
        // model: modelUse,
        messages: history,
        max_tokens,
        stream: false,
    }

    console.log(`body`, body)
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
    }

    const requestUrl = `${baseUrl}${ACCOUNT_ID}/ai/run/${modelUse}`

    console.log(`requestUrl`, requestUrl)
    if (isStream) {
        // @ts-ignore
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
                    const token = resultJson?.response || ``
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
            console.log(`fetchWorkersAI stream error`, e)
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
            console.log(`fetchWorkersAI`, result)
            msg = result?.result?.response || ``
        } catch (e) {
            console.log(`fetchWorkersAI error`, e)
            msg = String(e)
        }

        console.log(`msg`, msg)
        return msg
    }
}

const loaderWorkersAI = async (ctx: TBaseContext, args: IWorkersAIArgs, key: string) => {
    ctx.loaderWorkersAIArgs = {
        ...ctx.loaderWorkersAIArgs,
        [key]: args,
    }

    if (!ctx?.loaderWorkersAI) {
        ctx.loaderWorkersAI = new DataLoader<string, string>(
            async keys => {
                console.log(`loaderWorkersAI-keys-🐹🐹🐹`, keys)
                try {
                    const workersAIAnswerList = await Promise.all(
                        keys.map(key =>
                            fetchWorkersAI(ctx, {
                                ...ctx.loaderWorkersAIArgs[key],
                            })
                        )
                    )
                    return workersAIAnswerList
                } catch (e) {
                    console.log(`[loaderWorkersAI] error: ${e}`)
                }
                return new Array(keys.length || 1).fill({ status: false })
            },
            {
                batchScheduleFn: callback => setTimeout(callback, 100),
            }
        )
    }
    return ctx.loaderWorkersAI
}

export default { fetch: fetchWorkersAI, loader: loaderWorkersAI }
