# 评价分类器

把顾客评价交给大模型，自动判断它是好评、差评，还是关于口味/服务/物流的问题。

**线上演示**：https://fde-lab.netlify.app

## 技术栈

- 前端：HTML + 原生 JavaScript（`fetch`、`Promise.all`）
- 后端：Node.js + Express
- 模型：DeepSeek Chat API
- 部署：Netlify（静态页面 + Serverless Function）

## 它做了什么（不只是调个接口）

- **密钥不进前端**：页面上没有任何 key，请求经后端中转，浏览器拿到的只有结果
- **失败不白屏**：网络失败、8 秒超时都会显示「失败 + 再试一次」，而不是卡死
- **静态与接口分离**：`public/` 只放可以公开的文件，`server.js` 和 `.env` 不会被下载到

## 本地运行

1. 装 Node.js（18+）
2. `npm install`
3. 项目根目录建 `.env`，写一行：`DEEPSEEK_KEY=你的key`
4. `npm start`
5. 打开 http://localhost:3000/classify.html

## 踩过的坑
1.看不懂做的事情，因为没有基础知识，补充基础知识
2.全英文界面，看不到计算机语言，因为不懂编程，补充英语
3.网页软件不认识，新的应用软件不知道具体做什么，比如GITHUB


## 下一步
先做在学，学英语编程基本知识，做到看得懂，学习对应软件基本知识
