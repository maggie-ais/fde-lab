require("dotenv").config();
const express = require("express");
const app =express();

app.use(express.json());
app.use(express.static("public"));
app.post("/api/classify", async (req, res) => {
  const text = req.body.text;

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
});

app.get("/",(req,res)=>{
    res.send("server is alive");
})

app.listen(process.env.PORT || 3000,()=>{
    console.log("跑在 3000");
});
