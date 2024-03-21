import OpenAI from 'openai'

const openai = new OpenAI()

const resolversx = async () => {
    const completion = await openai.chat.completions.create({
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }],
        model: 'gpt-3.5-turbo',
    })

    console.log(completion.choices[0])
}

const typeDefinitions = {}

const resolvers = {}

export default {
    typeDefinitions,
    resolvers,
}
