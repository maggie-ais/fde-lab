exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ label: "只支持 POST" }) };
  }

  let text;
  try {
    const body = JSON.parse(event.body || "{}");
    text = body.text;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ label: "请求格式不对" }) };
  }
  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ label: "缺少 text" }) };
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
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: data.choices[0].message.content })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ label: "出错了：" + e.message }) };
  }
};
