const express = require("express");
const app = express();
app.use(express.json());

app.all("*", async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ label: "只支持 POST" });
  }
  const text = req.body && req.body.text;
  if (!text) {
    return res.status(400).json({ label: "缺少 text" });
  }
  try {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.DEEPSEEK_KEY
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是餐厅评价分类器。只回答一个词：好评/差评/口味/服务/物流。" },
          { role: "user", content: text }
        ]
      })
    });
    const data = await resp.json();
    res.json({ label: data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ label: "出错了：" + e.message });
  }
});

module.exports = app;
