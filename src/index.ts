import { createYoga } from 'graphql-yoga'
import { schema } from './schema'
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream'

// vercel edge runtime
export const runtime = 'edge'

const { handleRequest } = createYoga({
    schema,
    graphqlEndpoint: '/',
    context: {
        // 在这里设置全局上下文信息
    },
    plugins: [useDeferStream()],
})

export default async (req: any, res: any) => {
    return handleRequest(req, res)
}

// export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS }
