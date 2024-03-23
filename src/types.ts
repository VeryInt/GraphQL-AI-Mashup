enum Roles {
    system = 'system',
    user = 'user',
    assistant = 'assistant',
}

interface IMessage {
    role: Roles
    content: string
}

export interface IGeminiProArgs {
    prompt: string
    messages?: IMessage[]
    model?: string
    apiKey?: string
}
