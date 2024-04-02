import { IExecutableSchemaDefinition } from '@graphql-tools/schema'
import ChatCommon from './ChatCommon'
import GeminiPro from './GeminiPro'
import Claude from './Claude'
import Moonshot from './Moonshot'
import Openai from './Openai'
import Groq from './Groq'
import Lingyiwanwu from './Lingyiwanwu'
import Ernie from './Ernie'
import Qwen from './Qwen'
import Zhipu from './Zhipu'

const serviceList = [ChatCommon, Openai, GeminiPro, Claude, Moonshot, Groq, Lingyiwanwu, Ernie, Qwen, Zhipu]

export default {
    typeDefinitions: serviceList.map(service => service.typeDefinitions),
    resolverList: serviceList.map(service => service.resolvers) as IExecutableSchemaDefinition['resolvers'],
}
