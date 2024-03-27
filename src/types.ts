export enum Roles {
    system = 'system',
    user = 'user',
    assistant = 'assistant', // Openai
    model = 'model', // GeminiPro
}

export interface IMessage {
    role: Roles
    content: string
}

export interface ICommonDalArgs {
    messages?: IMessage[]
    model?: string
    apiKey?: string
    isStream?: boolean
    completeHandler?: (params: { content: string; status: boolean }) => void
    streamHanler?: (params: { token: string; status: boolean }) => void
}

export interface IErnieDalArgs extends ICommonDalArgs {
    secretKey?: string
}
