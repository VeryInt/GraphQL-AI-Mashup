# GraphQL-AI-Mashup
GraphQL-AI-Mashup 是一个集成各种类型 AI 接口的应用程序,通过 GraphQL 的方式统一访问,支持数据流(stream)等功能。

## 特性
- 支持多种 AI 服务,如 OpenAI、Anthropic Claude、GeminiPro 等
- 使用 GraphQL 统一访问 API,提供统一的调用参数
- 支持数据流(stream)功能
- 使用 DataLoader 优化 API 请求,提高性能
- 可一键部署到 Vercel

### AI支持列表
|AI||
|--|--|
|OpenAI||
|GeminiPro||
|Claude||
|Moonshot||

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

## 部署
### Vercel
本项目可以一键部署到 Vercel。点击下方按钮即可开始部署:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FVeryInt%2FGraphQL-AI-Mashup&env=GEMINI_PRO_API_KEY,CLAUDE_API_KEY,MOONSHOT_API_KEY,OPENAI_API_KEY&envDescription=API%20Keys%20for%20AI)

部署完成后,即可访问您的应用程序。

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

