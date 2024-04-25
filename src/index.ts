import { createYoga } from 'graphql-yoga'
import { schema } from './schema'
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream'

/**
 * vercel edge runtime
 * finally it works!!
 * use config and set runtime!!
 * do not set runtime as export directly
 * ==========> export const runtime = 'edge'
 * ==========> 👆 it doesn't work for deploying yoga-server in Vercel,
 * ==========> 👆 but it works for yoga as an api in nextjs!!!
 */
// export const config = {
//     runtime: 'edge',
// }
export const runtime = 'edge'

const { handleRequest } = createYoga({
    schema,
    graphqlEndpoint: '/',
    context: {
        // 在这里设置全局上下文信息
    },
    plugins: [useDeferStream()],
    fetchAPI: { Response },
})

// export default async (req: any, res: any) => {
//     return await handleRequest(req, res)
// }

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS }
