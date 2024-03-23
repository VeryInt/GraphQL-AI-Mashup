import { makeExecutableSchema } from '@graphql-tools/schema'
import services from './services'

export const schema = makeExecutableSchema({
    resolvers: services.resolverList,
    typeDefs: services.typeDefinitions,
})
