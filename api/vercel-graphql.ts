import { createYoga } from 'graphql-yoga'
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { IExecutableSchemaDefinition } from '@graphql-tools/schema'
import GeminiPro from '../src/services/GeminiPro'
import Claude from '../src/services/Claude'
import Moonshot from '../src/services/Moonshot'
import Openai from '../src/services/Openai'
import Groq from '../src/services/Groq'
import Lingyiwanwu from '../src/services/Lingyiwanwu'
import Ernie from '../src/services/Ernie'
import Qwen from '../src/services/Qwen'
import Zhipu from '../src/services/Zhipu'
import ChatCommon from '../src/services/ChatCommon'

/**
 * vercel edge runtime
 * finally it works!!
 * use config and set runtime!!
 * do not set runtime as export directly
 * ==========> export const runtime = 'edge'
 * ==========> 👆 it doesn't work for deploying yoga-server in Vercel,
 * ==========> 👆 but it works for yoga as an api in nextjs!!!
 */
export const config = {
    runtime: 'edge',
}

const serviceListWithoutAzure = [
    ChatCommon,
    Openai,
    GeminiPro,
    Claude,
    Moonshot,
    Groq,
    Lingyiwanwu,
    Ernie,
    Qwen,
    Zhipu,
]

const services = {
    typeDefinitions: serviceListWithoutAzure.map(service => service.typeDefinitions),
    resolverList: serviceListWithoutAzure.map(service => service.resolvers) as IExecutableSchemaDefinition['resolvers'],
}
const schema = makeExecutableSchema({
    resolvers: services.resolverList,
    typeDefs: services.typeDefinitions,
})

const { handleRequest } = createYoga({
    schema,
    graphqlEndpoint: '/',
    context: {
        // 在这里设置全局上下文信息
    },
    plugins: [useDeferStream()],
    fetchAPI: { Response },
})

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS }
