[中文说明](./README_zh.md)

# GraphQL-AI-Mashup
GraphQL-AI-Mashup is an application that integrates various types of AI interfaces, providing a unified access method through GraphQL, and supporting features such as data streaming (stream).

## Feature
- Supports multiple AI services, such as OpenAI, Anthropic Claude, GeminiPro, etc.
- Uses GraphQL to provide a unified API access, with standardized calling parameters
- Supports data streaming (stream) functionality
- Uses DataLoader to optimize API requests, improving performance
- Can be deployed to Vercel with a single click

### AI Support List
|AI||
|--|--|
|OpenAI||
|GeminiPro||
|Claude||
|Moonshot||

## Getting Started
### Install Dependencies
```bash
npm install
```

### Set API Key Environment Variables
```bash
cp .env.example .env
```
Modify the API keys in the ```.env``` file.

### Run Development Environment
```bash
npm run start
```

### Local Access
http://localhost:4000/

## Deployment
### Vercel
This project can be deployed to Vercel with a single click. Click the button below to start the deployment:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVeryInt%2FGraphQL-AI-Mashup&env=GEMINI_PRO_API_KEY,CLAUDE_API_KEY,MOONSHOT_API_KEY,OPENAI_API_KEY&envDescription=API%20Keys%20for%20AI)

After the deployment is complete, you can access your application.

## Usage Examples
The following is an example of using GraphQL to access the GeminiPro interface:
#### Query
```graphql
query MyQuery($params: ChatArgs) {
  chat(params: $params) {
    GeminiPro{text}
  }
}
```

#### Variables
```graphql
{
 "params": {
  "messages": [{
    "role": "user",
    "content": "Please tell an 800-word fairy tale"
  }]
 }
}
```

#### Stream Query
```graphql
query MyQuery($params: ChatArgs) {
  chat(params: $params) {
    GeminiProStream @stream
  }
}
```

### ScreenShots
<img width="800" alt="SCR-20240324-mjxc" src="https://github.com/VeryInt/GraphQL-AI-Mashup/assets/2792566/b3c15daa-fcc1-46ea-86ee-d72deda8c1c7">

