import { createSchema, createYoga } from 'graphql-yoga'
import { schema } from './schema'
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream'

const yoga = createYoga({
    schema,
    graphqlEndpoint: '/',
    context: {
        // 在这里设置全局上下文信息
    },
    plugins: [useDeferStream()],
    fetchAPI: { Response },
})

self.addEventListener('fetch', yoga)
