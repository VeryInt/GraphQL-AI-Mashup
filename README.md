[中文说明](./README_zh.md)

# GraphQL-AI-Mashup
GraphQL-AI-Mashup is an application that integrates various types of AI interfaces, providing a unified access method through GraphQL, and supporting features such as data streaming (stream).<br/>
New feature: Search the web in real time, by DuckDuckGo search engine.

## Feature
- Supports multiple AI services, such as OpenAI, Anthropic Claude, GeminiPro, etc.
- Uses GraphQL to provide a unified API access, with standardized calling parameters
- Supports data streaming (stream) functionality
- Uses DataLoader to optimize API requests, improving performance
- Can be deployed to Vercel with a single click

### AI Support List
|AI|Default Model|Documentation|Search web in real time|
|--|--|--|--|
|OpenAI|gpt-3.5-turbo|[Openai Models](https://platform.openai.com/docs/models)|Not Yet|
|Azure OpenAI|gpt-3.5-turbo|[Azure Openai Models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)|Yes|
|GeminiPro|gemini-1.0-pro-latest|[GeminiPro Models](https://ai.google.dev/models/gemini)|Not Yet|
|Claude|claude-3-haiku-20240307|[Claude Models](https://docs.anthropic.com/claude/docs/models-overview#model-recommendations)|Normal: Yes<br />Stream: No|
|Moonshot|moonshot-v1-8k|[Moonshot Models](https://platform.moonshot.cn/docs/pricing#文本生成模型-moonshot-v1)|Normal: Yes<br />Stream: No|
|Groq|mixtral-8x7b-32768|[Groq Models](https://console.groq.com/docs/models)|Not Yet|
|lingyiwanwu|yi-34b-chat-0205|[LingYiWanWu Models](https://platform.lingyiwanwu.com/docs#-%E5%A4%A7%E8%AF%AD%E8%A8%80%E6%A8%A1%E5%9E%8B)|Not Yet|
|Baidu Ernie|ernie-3.5-4k-0205|[Get API KEY & SECRET KEY](https://cloud.baidu.com/doc/WENXINWORKSHOP/s/yloieb01t)<br />[Ernie Models](https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Nlks5zkzu#%E5%AF%B9%E8%AF%9Dchat)|Not Yet|
|Ali Qwen|qwen-turbo|[Get API KEY](https://help.aliyun.com/document_detail/2712195.html?spm=a2c4g.2712581.0.i2)<br/>[Subscribe to Services](https://help.aliyun.com/document_detail/2586399.html)<br/>[Qwen Models](https://help.aliyun.com/document_detail/2713153.html?navBarStyle=white)|Yes|
|Zhipu AI|glm-3-turbo|[API & Token](https://open.bigmodel.cn/dev/api#http)<br />[Zhipu Models](https://open.bigmodel.cn/dev/api#language)|Not Yet|

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


## Docker
This project can be deployed via docker, and it comes with its own Dockerfile.

### Set API Key Environment Variables
```bash
cp .env.example .env
```
Modify the API keys in the ```.env``` file.

### Docker Image Build
```bash
docker build -t graphql-ai-mashup .    
```

### Docker Run
```bash
docker run -dp 4000:4000 graphql-ai-mashup
```

### Local Access
http://localhost:4000/



## Deployment
### Vercel
Due to Vercel's limitations on the edge runtime, please refer to the project [AI-Mashup-Web](https://github.com/VeryInt/AI-Mashup-Web) for deployment. 


### Cloudflare
This project can be deployed to Cloudflare worker also. Please follow the steps.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/VeryInt/GraphQL-AI-Mashup)

Install and configure wrangler
```bash
npm install -g wrangler

wrangler login
```

clone this repository
```bash
git clone git@github.com:VeryInt/GraphQL-AI-Mashup.git
```

Build and deploy your Cloudflare Worker
```bash
cd GraphQL-AI-Mashup

wrangler build

wrangler deploy
```


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

