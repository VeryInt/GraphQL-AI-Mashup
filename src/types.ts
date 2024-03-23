export enum Roles {
    system = 'system',
    user = 'user',
    assistant = 'assistant', // Openai
    model = 'model', // GeminiPro
}

interface IMessage {
    role: Roles
    content: string
}

export interface IGeminiProArgs {
    messages?: IMessage[]
    model?: string
    apiKey?: string
}
