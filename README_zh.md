# GraphQL-AI-Mashup
GraphQL-AI-Mashup 是一个集成各种类型 AI 接口的应用程序,通过 GraphQL 的方式统一访问,支持数据流(stream)等功能。<br />
新增支持<b>联网模式</b>，采用 DuckDuckGo 搜索引擎联网查询

## 特性
- 支持多种 AI 服务,如 OpenAI、Anthropic Claude、GeminiPro 等
- 使用 GraphQL 统一访问 API,提供统一的调用参数
- 支持数据流(stream)功能
- 支持联网(searchWeb)查询
- 使用 DataLoader 优化 API 请求,提高性能
- 可一键部署到 Vercel

### AI支持列表
|AI|默认模型|Model 文档|是暂未支持联网|
|--|--|--|--|
|OpenAI|gpt-3.5-turbo|[Openai Models](https://platform.openai.com/docs/models)|暂未支持|
|Cloudflare Workers AI|@cf/meta/llama-3-8b-instruct|[Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)|暂未支持|
|Azure OpenAI|gpt-3.5-turbo|[Azure Openai Models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)|是|
|GeminiPro|gemini-1.0-pro-latest|[GeminiPro Models](https://ai.google.dev/models/gemini)|暂未|
|Claude|claude-3-haiku-20240307|[Claude Models](https://docs.anthropic.com/claude/docs/models-overview#model-recommendations)|普通模式: 是<br />Stream: 暂未|
|Moonshot|moonshot-v1-8k|[Moonshot Models](https://platform.moonshot.cn/docs/pricing#文本生成模型-moonshot-v1)|普通模式: 是<br />Stream: 暂未|
|Groq|mixtral-8x7b-32768|[Groq Models](https://console.groq.com/docs/models)|普通模式: 是<br />Stream: 暂未|
|零一万物|yi-34b-chat-0205|[零一万物 Models](https://platform.lingyiwanwu.com/docs#-%E5%A4%A7%E8%AF%AD%E8%A8%80%E6%A8%A1%E5%9E%8B)|暂未支持|
|百度 Ernie|ernie-3.5-4k-0205|[获取API KEY & SECRET KEY](https://cloud.baidu.com/doc/WENXINWORKSHOP/s/yloieb01t)<br />[Ernie Models](https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Nlks5zkzu#%E5%AF%B9%E8%AF%9Dchat)|暂未支持|
|阿里千问|qwen-turbo|[获取API KEY](https://help.aliyun.com/document_detail/2712195.html?spm=a2c4g.2712581.0.i2)<br/>[开通服务](https://help.aliyun.com/document_detail/2586399.html)<br/>[千问 Models](https://help.aliyun.com/document_detail/2713153.html?navBarStyle=white)|是|
|智谱 AI|glm-3-turbo|[API & Token](https://open.bigmodel.cn/dev/api#http)<br />[智谱 Models](https://open.bigmodel.cn/dev/api#language)|暂未支持|

## 快速开始
### 安装依赖
```bash
npm install
```

### 设置API KEY环境变量
```bash
cp .env.example .env
```
修改 ```.env```中的各个API KEY

### 运行开发环境
```bash
npm run start
```

### 本地访问
http://localhost:4000/

## Docker
本项目也可通过 docker 部署，项目已经自带 Dockerfile 。

### 设置API KEY环境变量
```bash
cp .env.example .env
```
修改 ```.env```中的各个API KEY

### Docker Image Build
```bash
docker build -t graphql-ai-mashup .    
```

### Docker Run
```bash
docker run -dp 4000:4000 graphql-ai-mashup
```

### 本地访问
http://localhost:4000/


## 部署
### Vercel
由于 Vercel 对于 edge runtime 的限制，请参考项目 [AI-Mashup-Web](https://github.com/VeryInt/AI-Mashup-Web) 进行部署


### Cloudflare
本项目也可部署至 Cloudflare worker。请根据以下步骤实施。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/VeryInt/GraphQL-AI-Mashup)

安装并登录 wrangler
```bash
npm install -g wrangler

wrangler login
```

克隆当前仓库
```bash
git clone git@github.com:VeryInt/GraphQL-AI-Mashup.git
```

Build 并部署至您的 Cloudflare Worker
```bash
cd GraphQL-AI-Mashup

wrangler build

wrangler deploy
```

## 使用示例
以下是一个使用 GraphQL 访问 GeminiPro 接口的示例:
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
    "content": "请讲一个800字左右的童话故事"
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

