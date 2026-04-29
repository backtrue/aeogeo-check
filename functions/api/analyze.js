// Scrape Helper
async function scrapeUrl(url) {
  const siteResponse = await fetch(url);
  const html = await siteResponse.text();
  const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
  const metaDesc = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || '';
  const bodyText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                       .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ')
                       .substring(0, 2500);
  return { title, metaDesc, bodyText };
}

// OpenAI Caller
async function callOpenAI(key, model, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`);
  return JSON.parse(data.choices[0].message.content);
}

// Gemini Caller
async function callGemini(key, model, prompt) {
  // Simple version using fetch to Gemini API
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt + " (Output strictly valid JSON)" }] }],
      generationConfig: { response_mime_type: "application/json" }
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`Gemini Error: ${data.error.message}`);
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

// Original GLM Helper (for other steps)
async function callGLM(env, prompt) {
  const model = '@cf/zhipuai/glm-4-9b-chat';
  const messages = [{ role: 'system', content: 'Output valid JSON.' }, { role: 'user', content: prompt }];
  if (env.AI) return await env.AI.run(model, { messages });
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const json = await resp.json();
  return json.result;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const { url, step, previousResults, keys } = await request.json();

  try {
    if (step === 1) {
      const siteData = await scrapeUrl(url);
      const subPrompt = `分析以下內容，判斷品牌身份、核心產品、品類、目標受眾與差異點。內容：\nTitle: ${siteData.title}\nContent: ${siteData.bodyText}`;
      
      // Parallel calls for Step 1 Analysis using specified models
      const [openaiAnalysis, geminiAnalysis] = await Promise.all([
        callOpenAI(keys.openai, 'gpt-5.4-nano', subPrompt),
        callGemini(keys.gemini, 'gemini-2.5-flash', subPrompt)
      ]);

      // Final Synthesis using GPT-5.4
      const synthesisPrompt = `
你是一位 SEO 專家。請綜合以下兩位 AI 專家的品牌分析結果，產出一份最終且最精準的品牌診斷報告。
專家 A (GPT-5.4 Nano) 的見解：${JSON.stringify(openaiAnalysis)}
專家 B (Gemini 2.5 Flash) 的見解：${JSON.stringify(geminiAnalysis)}

請根據以上資訊，輸出以下 JSON 結構：
{
  "brandIdentity": "品牌是誰",
  "offerings": "提供什麼產品服務",
  "categories": "應被歸類在哪些主題/品類",
  "audiences": "服務哪些使用者角色",
  "differentiation": "與競品的差異點"
}`;

      const finalResult = await callOpenAI(keys.openai, 'gpt-5.4', synthesisPrompt);
      return new Response(JSON.stringify(finalResult), { headers: { 'Content-Type': 'application/json' } });
    }

    if (step === 2) {
      // Step 2 still uses GLM for the diagnosis generation part as originally requested
      const prompt = `根據品牌分析：${JSON.stringify(previousResults)}，建立 30 題 AI 搜尋測試題庫...`;
      const aiResponse = await callGLM(env, prompt);
      return new Response(JSON.stringify(aiResponse), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid step' }), { status: 400 });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
