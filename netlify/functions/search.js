// netlify/functions/search.js
// Netlify 版检索接口：一次 embedding + 一次 chat（合并精排与回答，避免超时）
const docs = require("./data/reviews.json");
const docVecs = require("./data/vectors.json");

const KEYWORDS = ["甜", "糖", "齁", "腻", "糖霜", "咸", "包装"];

function cos(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embed(text) {
  const resp = await fetch("https://api.siliconflow.cn/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.SILICONFLOW_KEY
    },
    body: JSON.stringify({ model: "BAAI/bge-m3", input: [text] })
  });
  const data = await resp.json();
  if (!data.data) throw new Error("embedding 失败：" + JSON.stringify(data).slice(0, 160));
  return data.data[0].embedding;
}

async function chat(system, user) {
  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.DEEPSEEK_KEY
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0
    })
  });
  const data = await resp.json();
  if (!data.choices) throw new Error("chat 失败：" + JSON.stringify(data).slice(0, 160));
  return data.choices[0].message.content;
}

function keywordSearch(question, k) {
  const words = KEYWORDS.filter((w) => question.includes(w));
  return docs
    .map((t) => ({ t, hits: words.filter((w) => t.includes(w)).length }))
    .filter((r) => r.hits > 0)
    .sort((x, y) => y.hits - x.hits)
    .slice(0, k);
}

// 把模型输出拆成「依据」和「回答」
function parseOutput(text) {
  const evidence = [];
  let answer = text.trim();

  const evMatch = text.match(/【依据】([\s\S]*?)(?=【回答】|$)/);
  const anMatch = text.match(/【回答】([\s\S]*)$/);

  if (evMatch) {
    evMatch[1].split("\n").forEach((line) => {
      const s = line
        .trim()
        .replace(/^\d+[.、)]\s*/, "")
        .replace(/^[-•]\s*/, "");
      if (s.length > 2) evidence.push(s);
    });
  }
  if (anMatch) answer = anMatch[1].trim();

  return { evidence, answer };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "只支持 POST" }) };
  }

  let question;
  try {
    question = (JSON.parse(event.body || "{}").question || "").trim();
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "请求格式不对" }) };
  }
  if (!question) {
    return { statusCode: 400, body: JSON.stringify({ error: "问题不能为空" }) };
  }

  try {
    // ① 问题变向量
    const qv = await embed(question);

    // ② 向量路
    const vecTop = docs
      .map((t, i) => ({ t, s: cos(qv, docVecs[i]) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, 6);

    // ③ 关键词路
    const kwTop = keywordSearch(question, 6);

    // ④ 合并去重
    const merged = [...new Set([...vecTop.map((r) => r.t), ...kwTop.map((r) => r.t)])];

    // ⑤ 一次调用：挑依据 + 回答
    const system =
      "你是烘焙店运营助手。只能根据给你的评价回答，不许编造。\n"
      + "输出必须严格分成两段：\n"
      + "【依据】下面列出你选中的评价原文，每条一行，最多 4 条，不要编号。\n"
      + "【回答】下面用一两句人话回答。\n"
      + "如果资料能回答，就照资料答；"
      + "如果资料只提到一点、不够下结论，就说「资料里只有 X 条提到，可能不足以判断」；"
      + "如果资料完全没提到，就说「资料里没有」。";

    const user =
      "问题：" + question + "\n\n"
      + "候选评价（共 " + merged.length + " 条）：\n"
      + merged.map((t) => "- " + t).join("\n");

    const raw = await chat(system, user);
    const { evidence, answer } = parseOutput(raw);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ question, evidence, answer })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "出错了：" + e.message })
    };
  }
};
