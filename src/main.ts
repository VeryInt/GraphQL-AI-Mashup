import { createServer } from 'http'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema'
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream'

function main() {
    const yoga = createYoga({
        schema,
        graphqlEndpoint: '/',
        context: {
            // 在这里设置全局上下文信息
        },
        plugins: [useDeferStream()],
    })
    const server = createServer(yoga)
    server.listen(4000, () => {
        console.info('Server is running on http://localhost:4000/graphql')
    })
}

main()
