import { Roles, IMessage } from '../types'
export const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1024,
}

export enum ChainType {
    Enhance = 'Enhance',
    Assign = 'Assign',
}

export const searchWebSystemMessage: IMessage = {
    role: Roles.system,
    content: `你是一个具有实时查询并且可以通过联网功能的智能助手，如果你不知道答案或者用户的提问的内容需要通过联网获取最新信息，你就一定会使用 get_internet_serch_result 这个可以实时查询的工具来获取相关联网资料，再根据资料结合用户的提问来回答。`,
}

export const searchWebTool = {
    type: 'function',
    function: {
        name: 'get_internet_serch_result',
        description: 'Get the latest search results from DuckDuckGo',
        parameters: {
            type: 'object',
            properties: {
                searchText: {
                    type: 'string',
                    description: 'The text to search',
                },
                count: {
                    type: 'number',
                    description: 'The search result count',
                },
            },
            required: ['searchText'],
        },
    },
}
