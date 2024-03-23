import { IExecutableSchemaDefinition } from '@graphql-tools/schema'
import ChatCommon from './ChatCommon'
import GeminiPro from './GeminiPro'
import Claude from './Claude'

const serviceList = [ChatCommon, GeminiPro, Claude]

export default {
    typeDefinitions: serviceList.map(service => service.typeDefinitions),
    resolverList: serviceList.map(service => service.resolvers) as IExecutableSchemaDefinition['resolvers'],
}
