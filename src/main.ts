import { createServer } from 'http'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema'

function main() {
    const yoga = createYoga({
        schema,
        graphqlEndpoint: '/',
        context: {
            // 在这里设置全局上下文信息
        },
    })
    const server = createServer(yoga)
    server.listen(4000, () => {
        console.info('Server is running on http://localhost:4000/graphql')
    })
}

main()