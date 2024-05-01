import { IMessage, Roles } from '../types'
import _ from 'lodash'
import DuckDuckGoSearch from '../lib/duckduckgoSearch'

export const mergeMessages = (messages: IMessage[] | undefined): IMessage[] => {
    const mergedMessages: IMessage[] = []
    let previousRole: Roles | undefined
    let previousContent = ''

    if (!messages) {
        return []
    }

    for (const message of messages) {
        const { role, content } = message

        if (role === previousRole) {
            previousContent += ` ${content}`
        } else {
            if (previousRole) {
                mergedMessages.push({ role: previousRole, content: previousContent })
            }
            previousRole = role
            previousContent = content
        }
    }

    if (previousRole) {
        mergedMessages.push({ role: previousRole, content: previousContent })
    }

    return mergedMessages
}

interface IFetchEventStreamProps {
    url: string
    options: Record<string, any>
    completeHandler: () => void
    streamHandler: (data: any) => void
    regex?: RegExp
}

export const fetchEventStream = async ({
    url,
    options,
    completeHandler,
    streamHandler,
    regex,
}: IFetchEventStreamProps) => {
    const response: Record<string, any> = await fetch(url, options)
    const useRegex: RegExp = regex || new RegExp(/^.*?data:/gs)
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
        console.log(`singleChunk`, chunk)
        eventStreamBuffer += chunk

        // 处理缓冲区中的完整事件
        const completeMessages = eventStreamBuffer.split('\n\n') // 每个事件以两个换行符分隔
        _.each(completeMessages.slice(0, -1), message => {
            const data = message.replace(useRegex, '') // 删除每个事件前面的“data: ”
            console.log('Received message:', data)
            console.log(`==========================`)
            streamHandler(data)
        })

        // 保存最后一个不完整的消息
        eventStreamBuffer = completeMessages[completeMessages.length - 1]
        console.log(`eventStreamBuffer====>`, eventStreamBuffer)
        // 继续读取下一个数据块
        reader.read().then(processStream)
    })
}

export const sleep = (sec: number) => new Promise(resolve => setTimeout(resolve, sec * 1000))

export const getInternetSerchResult = async (searchText: string, count?: number): Promise<string> => {
    const resultList = []
    const duckDuckGoSearch = new DuckDuckGoSearch()
    const searchResults = duckDuckGoSearch.text({
        keywords: searchText,
        safesearch: 'off',
    })
    count = count || 10
    console.log(`count: ${count}, searchText: ${searchText}`)
    let index = 0
    try {
        for await (const result of searchResults) {
            console.log(result)
            const { title, body } = result
            resultList.push(`${index + 1}. title: ${title}\n description: ${body}`)
            if (++index >= count) {
                break
            }
        }

        const result = resultList.join('\n\n')

        console.log(`🐹🐹🐹 getInternetSerchResult: ${result}`)
        return result
    } catch (e) {
        console.log(`getInternetSerchResult error`, e)
    }

    return ''
}
