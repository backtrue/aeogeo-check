
export function cleanJSON(str) {
  try {
    // Attempt to extract JSON from markdown or text
    let jsonStr = str;
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    const firstBracket = str.indexOf('[');
    const lastBracket = str.lastIndexOf(']');

    // Find the outermost JSON structure
    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = lastBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
      end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
      jsonStr = str.substring(start, end + 1);
    } else {
      // Fallback: strip backticks
      jsonStr = str.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse JSON:', str);
    throw new Error('AI 回傳格式錯誤，請重試。');
  }
}

export async function callOpenAIDirect(key, model, prompt, isRaw = false) {
  const body = {
    model,
    messages: [{ role: "user", content: prompt }]
  };
  if (!isRaw) {
    body.response_format = { type: "json_object" };
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await resp.json();
  if (data.error) {
    console.error('OpenAI Error Details:', data.error);
    throw new Error(`OpenAI (${model}): ${data.error.message}`);
  }
  const content = data.choices[0].message.content;
  return isRaw ? content : cleanJSON(content);
}

export async function callGeminiDirect(key, model, prompt, isRaw = false, responseSchema = null) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  if (!isRaw) {
    body.systemInstruction = { parts: [{ text: 'You must output only valid JSON. No markdown, no explanation, no extra text.' }] };
    body.generationConfig = { response_mime_type: "application/json" };
    if (responseSchema) {
      body.generationConfig.responseSchema = responseSchema;
    }
  }

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  if (data.error) {
    throw new Error(`Gemini (${model}): ${data.error.message}`);
  }
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error(`Gemini (${model}): 無法產出內容`);
  }
  const content = data.candidates[0].content.parts[0].text;
  return isRaw ? content : cleanJSON(content);
}
