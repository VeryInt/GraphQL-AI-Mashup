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
|AI|Default Model|Documentation|
|--|--|--|
|OpenAI|gpt-3.5-turbo|[Openai Models](https://platform.openai.com/docs/models)|
|GeminiPro|gemini-1.0-pro-latest|[GeminiPro Models](https://ai.google.dev/models/gemini)|
|Claude|claude-3-haiku-20240307|[Claude Models](https://docs.anthropic.com/claude/docs/models-overview#model-recommendations)|
|Moonshot|moonshot-v1-8k|[Moonshot Models](https://platform.moonshot.cn/docs/pricing#文本生成模型-moonshot-v1)|
|Groq|mixtral-8x7b-32768|[Groq Models](https://console.groq.com/docs/models)|
|lingyiwanwu|yi-34b-chat-0205|[lingyiwanwu Models](https://platform.lingyiwanwu.com/docs#-%E5%A4%A7%E8%AF%AD%E8%A8%80%E6%A8%A1%E5%9E%8B)|

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

