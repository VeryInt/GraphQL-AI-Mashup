import mainYoga from './main'
import { createServer } from 'http'

const server = createServer(mainYoga)
server.listen(4000, () => {
    console.info('Server is running on http://localhost:4000/graphql')
})
