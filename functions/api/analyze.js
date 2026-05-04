const OPENAI_DEFAULTS = {
  synthesis: 'gpt-5.4',
  balanced: 'gpt-5.4-mini',
  extraction: 'gpt-5.4-nano'
};

const GEMINI_DEFAULTS = {
  synthesis: 'gemini-2.5-pro',
  balanced: 'gemini-2.5-flash',
  extraction: 'gemini-2.5-flash'
};
const MAX_SITE_CHARS = 7000;
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const STEP4_SCENARIOS = [
  '完全沒引用網站內容',
  '引用內容但沒標明來源',
  '回答沒有提到品牌',
  '品牌描述籠統',
  '品牌描述錯誤',
  '只提競品不提本品牌',
  '品牌被放在錯誤語境',
  '回答缺少商業決策資訊',
  '回答有提到品牌但缺少下一步行動理由'
];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function normalizeUrl(value) {
  if (typeof value !== 'string') throw new Error('url 必須是字串。');
  const trimmed = value.trim();
  if (!trimmed) throw new Error('url 不可為空。');
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('只支援 HTTP/HTTPS URL。');
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJson(text) {
  if (typeof text !== 'string') throw new Error('AI 回傳不是文字。');
  const trimmed = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch (parseError) {
    const firstObject = trimmed.indexOf('{');
    const firstArray = trimmed.indexOf('[');
    const startsWithArray = firstArray !== -1 && (firstObject === -1 || firstArray < firstObject);
    const start = startsWithArray ? firstArray : firstObject;
    const end = startsWithArray ? trimmed.lastIndexOf(']') : trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error('AI 回傳格式不是 JSON。', { cause: parseError });
    }
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (secondError) {
      throw new Error('AI 回傳 JSON 解析失敗。', { cause: secondError });
    }
  }
}

function coerceArray(value, expectedLength = null) {
  if (Array.isArray(value)) return expectedLength ? value.slice(0, expectedLength) : value;
  if (value && typeof value === 'object') {
    const directArray = Object.values(value).find(Array.isArray);
    if (directArray) return expectedLength ? directArray.slice(0, expectedLength) : directArray;
  }
  return [];
}

function safeKeyPart(value) {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'unknown';
}

function getUrlHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown-host';
  }
}

function getCompletedSteps(result) {
  return [1, 2, 3, 4, 5, 6].filter((step) => result?.[`step${step}`]);
}

function getStepDependencies(step) {
  return {
    3: [2],
    4: [2, 3],
    5: [2, 3, 4],
    6: [5]
  }[step] || [];
}

function getDependencyRecords(step, previousResults) {
  const stepRecords = previousResults?.stepRecords && typeof previousResults.stepRecords === 'object'
    ? previousResults.stepRecords
    : {};
  return getStepDependencies(step).reduce((dependencies, dependencyStep) => {
    const record = stepRecords[String(dependencyStep)] || stepRecords[dependencyStep];
    if (record?.recordId) {
      dependencies[String(dependencyStep)] = {
        recordId: record.recordId,
        persistedAt: record.persistedAt || record.createdAt || null,
        stepKey: record.stepKey || null
      };
    }
    return dependencies;
  }, {});
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function putR2Json(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
}

async function getR2Json(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  try {
    return await object.json();
  } catch (error) {
    console.error(JSON.stringify({ event: 'r2_json_read_failed', key, error: error.message }));
    return null;
  }
}

function toR2Timestamp(value) {
  return value.replace(/[:.]/g, '-');
}

async function persistQuestionBank(env, context) {
  const bucket = env.AEO_STORAGE;
  const { url, hostKey, runId, timestamp, data, previousResults } = context;
  const questions = coerceArray(data, 30);
  const setRecord = {
    schemaVersion: 1,
    kind: 'aeo-question-set',
    url,
    host: getUrlHost(url),
    runId,
    createdAt: timestamp,
    sourceStep1: previousResults.step1 || null,
    questions
  };

  await putR2Json(bucket, `question-bank/sets/${hostKey}/${timestamp}-${runId}.json`, setRecord);
  await putR2Json(bucket, `question-bank/latest/${hostKey}.json`, setRecord);

  await Promise.all(questions.map(async (question, index) => {
    const hash = await sha256Hex(JSON.stringify({
      type: question.type || '',
      question: question.question || '',
      check: question.check || '',
      ideal: question.ideal || '',
      gap: question.gap || ''
    }));
    const questionRecord = {
      schemaVersion: 1,
      kind: 'aeo-question',
      id: hash,
      url,
      host: getUrlHost(url),
      runId,
      setCreatedAt: timestamp,
      order: index + 1,
      step1: previousResults.step1 || null,
      ...question
    };
    await putR2Json(bucket, `question-bank/questions/${hash}.json`, questionRecord);
    await putR2Json(bucket, `question-bank/by-host/${hostKey}/${hash}.json`, questionRecord);
  }));
}

async function persistStepResult(env, context) {
  const bucket = env.AEO_STORAGE;
  if (!bucket) throw new Error('R2 binding AEO_STORAGE 尚未設定，無法保存診斷結果。');

  const { url, step, data, previousResults, runId, dependencyRecords = {}, providerMode } = context;
  const timestamp = new Date().toISOString();
  const recordId = toR2Timestamp(timestamp);
  const hostKey = safeKeyPart(getUrlHost(url));
  const manifestKey = `runs/${hostKey}/${runId}/manifest.json`;
  const latestManifestKey = `latest/${hostKey}/manifest.json`;
  const historicalStepKey = `runs/${hostKey}/${runId}/steps/step-${step}/${recordId}.json`;
  const latestStepKey = `latest/${hostKey}/step-${step}.json`;
  const existingManifest = await getR2Json(bucket, manifestKey);
  const existingStepHistory = existingManifest?.stepHistory && typeof existingManifest.stepHistory === 'object'
    ? existingManifest.stepHistory
    : {};
  const currentStepHistory = Array.isArray(existingStepHistory[String(step)]) ? existingStepHistory[String(step)] : [];
  const resultSnapshot = { ...(previousResults || {}), url, runId, [`step${step}`]: data };
  const stepRecord = {
    schemaVersion: 1,
    kind: 'aeo-step-result',
    url,
    host: getUrlHost(url),
    runId,
    recordId,
    step,
    providerMode,
    dependencyRecords,
    createdAt: timestamp,
    data
  };
  const stepHistoryEntry = {
    recordId,
    step,
    createdAt: timestamp,
    providerMode,
    dependencyRecords,
    key: historicalStepKey,
    latestKey: latestStepKey
  };
  const stepHistory = {
    ...existingStepHistory,
    [String(step)]: [...currentStepHistory, stepHistoryEntry]
  };
  const manifest = {
    schemaVersion: 1,
    kind: 'aeo-run-manifest',
    url,
    host: getUrlHost(url),
    runId,
    updatedAt: timestamp,
    completedSteps: getCompletedSteps(resultSnapshot),
    latestStep: step,
    providerMode,
    latestRecords: {
      ...(existingManifest?.latestRecords && typeof existingManifest.latestRecords === 'object' ? existingManifest.latestRecords : {}),
      [String(step)]: stepHistoryEntry
    },
    stepHistory
  };

  await Promise.all([
    putR2Json(bucket, historicalStepKey, stepRecord),
    putR2Json(bucket, `runs/${hostKey}/${runId}/latest/step-${step}.json`, stepRecord),
    putR2Json(bucket, manifestKey, manifest),
    putR2Json(bucket, latestStepKey, stepRecord),
    putR2Json(bucket, latestManifestKey, manifest)
  ]);

  if (step === 2) {
    await persistQuestionBank(env, { url, hostKey, runId, timestamp, data, previousResults });
  }

  return {
    bucket: 'aeogeo-check-data',
    runId,
    recordId,
    persistedAt: timestamp,
    providerMode,
    dependencies: dependencyRecords,
    stepKey: historicalStepKey,
    latestStepKey
  };
}

function resolveProviderKey(env, requestKeys, providerName, secretName) {
  const byok = requestKeys?.[providerName];
  if (typeof byok === 'string' && byok.trim()) return byok.trim();
  const fallback = env[secretName];
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  throw new Error(`缺少 ${providerName} API Key。請於前端填入 BYOK，或設定 Cloudflare Secret: ${secretName}`);
}

function hasProviderKey(env, requestKeys, providerName, secretName) {
  const byok = requestKeys?.[providerName];
  const fallback = env[secretName];
  return Boolean((typeof byok === 'string' && byok.trim()) || (typeof fallback === 'string' && fallback.trim()));
}

function resolveProviderMode(env, requestKeys) {
  const hasOpenAI = hasProviderKey(env, requestKeys, 'openai', 'OPENAI_API_KEY');
  const hasGemini = hasProviderKey(env, requestKeys, 'gemini', 'GEMINI_API_KEY');
  if (hasOpenAI && hasGemini) return 'dual';
  if (hasOpenAI) return 'openai-only';
  if (hasGemini) return 'gemini-only';
  throw new Error('請至少填入一組 OpenAI 或 Gemini API Key。');
}

async function scrapeUrl(url) {
  const targets = [url, `https://r.jina.ai/http://${new URL(url).host}${new URL(url).pathname}`];
  let lastError = null;

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        headers: { 'User-Agent': 'AeogeoCheck/1.0 (+https://developers.cloudflare.com/pages/functions/)' }
      });
      if (!response.ok) {
        lastError = new Error(`抓取失敗 ${response.status}`);
        continue;
      }
      const raw = await response.text();
      const title = raw.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() || url;
      const metaDesc = raw.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)?.[1]?.trim() || '';
      const bodyText = stripHtml(raw).slice(0, MAX_SITE_CHARS);
      if (bodyText.length >= 120) return { title, metaDesc, bodyText, source: target };
      lastError = new Error('抓取內容過短。');
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(JSON.stringify({ event: 'scrape_fallback', url, error: lastError?.message }));
  return {
    title: url,
    metaDesc: '',
    bodyText: `目前資料不足。網站 URL 為 ${url}，主要內容無法由伺服器抓取。`,
    source: 'fallback'
  };
}

async function callOpenAI(env, requestKeys, model, prompt) {
  const key = resolveProviderKey(env, requestKeys, 'openai', 'OPENAI_API_KEY');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: `${prompt}\n\n只輸出合法 JSON。` }],
      response_format: { type: 'json_object' }
    })
  });
  const rawText = await response.text();
  const data = (() => {
    try {
      return rawText ? JSON.parse(rawText) : null;
    } catch (error) {
      console.error(JSON.stringify({ event: 'openai_non_json', model, status: response.status, body: rawText.slice(0, 200) }));
      throw new Error(`OpenAI (${model}) 回傳非 JSON（HTTP ${response.status}）：${rawText.slice(0, 120)}`, { cause: error });
    }
  })();
  if (!response.ok || data?.error) {
    console.error(JSON.stringify({ event: 'openai_error', model, status: response.status, error: data?.error?.message }));
    throw new Error(`OpenAI (${model}) 呼叫失敗: ${data?.error?.message || response.status}`);
  }
  return extractJson(data.choices?.[0]?.message?.content || '');
}

async function callGemini(env, requestKeys, model, prompt) {
  const key = resolveProviderKey(env, requestKeys, 'gemini', 'GEMINI_API_KEY');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt}\n\n只輸出合法 JSON。` }] }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  });
  const rawText = await response.text();
  const data = (() => {
    try {
      return rawText ? JSON.parse(rawText) : null;
    } catch (error) {
      console.error(JSON.stringify({ event: 'gemini_non_json', model, status: response.status, body: rawText.slice(0, 200) }));
      throw new Error(`Gemini (${model}) 回傳非 JSON（HTTP ${response.status}）：${rawText.slice(0, 120)}`, { cause: error });
    }
  })();
  if (!response.ok || data?.error) {
    console.error(JSON.stringify({ event: 'gemini_error', model, status: response.status, error: data?.error?.message }));
    throw new Error(`Gemini (${model}) 呼叫失敗: ${data?.error?.message || response.status}`);
  }
  return extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

async function callGeminiWithFallback(env, requestKeys, primaryModel, fallbackModel, prompt) {
  try {
    return await callGemini(env, requestKeys, primaryModel, prompt);
  } catch (error) {
    if (!fallbackModel || fallbackModel === primaryModel) throw error;
    console.warn(JSON.stringify({ event: 'gemini_model_fallback', primaryModel, fallbackModel, error: error.message }));
    return callGemini(env, requestKeys, fallbackModel, prompt);
  }
}

function getStep1Prompt(siteData) {
  return `
你是 AEO/GEO 實體診斷顧問。根據下列網站內容，判斷品牌身份、產品/服務、分類情境、使用者角色與競品差異點。
資料不足時，欄位內必須明確寫「目前資料不足」，再給出可追溯到 URL 或文本的保守推論。

網站標題：${siteData.title}
Meta description：${siteData.metaDesc}
內容：${siteData.bodyText}

輸出 JSON object，欄位必須完全如下：
{
  "brandIdentity": "品牌身份，Who is it",
  "offerings": "核心產品/服務/內容",
  "categories": "AI 應歸類的主題/品類/情境",
  "audiences": "使用者角色與搜尋意圖",
  "differentiation": "競品差異點；不足時標註目前資料不足",
  "evidence": ["可支撐判斷的文本或事實片段"]
}`;
}

async function runStep1(env, requestKeys, url, providerMode) {
  const siteData = await scrapeUrl(url);
  const prompt = getStep1Prompt(siteData);

  if (providerMode === 'openai-only') {
    const analysis = await callOpenAI(env, requestKeys, env.OPENAI_BALANCED_MODEL || OPENAI_DEFAULTS.balanced, prompt);
    const synthesisPrompt = `
請統合 OpenAI 分析與原始網站資料，輸出最終 Step 1 診斷。

OpenAI 分析：${JSON.stringify(analysis)}
原始網站資料：${JSON.stringify(siteData)}

輸出 JSON object，欄位必須完全如下：brandIdentity, offerings, categories, audiences, differentiation, evidence。`;
    const result = await callOpenAI(env, requestKeys, env.OPENAI_SYNTHESIS_MODEL || OPENAI_DEFAULTS.synthesis, synthesisPrompt);
    return { ...result, providerMode, sourceUrl: url, scrapedSource: siteData.source, fetchedAt: new Date().toISOString() };
  }

  if (providerMode === 'gemini-only') {
    const analysis = await callGemini(env, requestKeys, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt);
    const synthesisPrompt = `
請統合 Gemini 分析與原始網站資料，輸出最終 Step 1 診斷。

Gemini 分析：${JSON.stringify(analysis)}
原始網站資料：${JSON.stringify(siteData)}

輸出 JSON object，欄位必須完全如下：brandIdentity, offerings, categories, audiences, differentiation, evidence。`;
    const result = await callGeminiWithFallback(
      env,
      requestKeys,
      env.GEMINI_SYNTHESIS_MODEL || GEMINI_DEFAULTS.synthesis,
      env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced,
      synthesisPrompt
    );
    return { ...result, providerMode, sourceUrl: url, scrapedSource: siteData.source, fetchedAt: new Date().toISOString() };
  }

  const [openaiAnalysis, geminiAnalysis] = await Promise.allSettled([
    callOpenAI(env, requestKeys, env.OPENAI_EXTRACTION_MODEL || OPENAI_DEFAULTS.extraction, prompt),
    callGemini(env, requestKeys, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt)
  ]);

  const synthesisPrompt = `
請統合兩份模型分析，輸出最終 Step 1 診斷。若某模型失敗，不要編造，改用成功模型與原始網站內容補足。

OpenAI 分析：${JSON.stringify(openaiAnalysis)}
Gemini 分析：${JSON.stringify(geminiAnalysis)}
原始網站資料：${JSON.stringify(siteData)}

輸出 JSON object，欄位必須完全如下：brandIdentity, offerings, categories, audiences, differentiation, evidence。`;

  const result = await callOpenAI(env, requestKeys, env.OPENAI_SYNTHESIS_MODEL || OPENAI_DEFAULTS.synthesis, synthesisPrompt);
  return { ...result, providerMode, sourceUrl: url, scrapedSource: siteData.source, fetchedAt: new Date().toISOString() };
}

async function runStep2(env, requestKeys, previousResults, providerMode) {
  const step1 = previousResults.step1;
  if (!step1) throw new Error('Step 2 需要 Step 1 結果。');
  const prompt = `
根據 Step 1 診斷建立 30 題 AI 搜尋測試題庫。必須平均覆蓋 6 類：定義、比較、方法、情境、推薦、決策。題目要去品牌化，不得在 question 內直接提到品牌名稱。

Step 1：${JSON.stringify(step1)}

輸出 JSON object：
{
  "questions": [
    {"type":"定義|比較|方法|情境|推薦|決策", "question":"測試問題", "check":"這題要檢查什麼", "ideal":"理想中 AI 應該怎麼回答", "gap":"若沒提到品牌，代表什麼缺口"}
  ]
}
questions 必須剛好 30 筆。`;
  const result = providerMode === 'openai-only'
    ? await callOpenAI(env, requestKeys, env.OPENAI_SYNTHESIS_MODEL || OPENAI_DEFAULTS.synthesis, prompt)
    : await callGemini(env, requestKeys, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt);
  return coerceArray(result.questions || result, 30);
}

async function runStep3(env, requestKeys, previousResults, providerMode) {
  const { step1, step2 } = previousResults;
  if (!step1 || !step2) throw new Error('Step 3 需要 Step 1 與 Step 2 結果。');
  const prompt = `
從 30 題中挑出最重要的 10 題。排序依據：真實搜尋可能性、AI 對品牌理解度、商業價值、競爭關係。

Step 1：${JSON.stringify(step1)}
題庫：${JSON.stringify(step2)}

輸出 JSON object：
{
  "topQuestions": [
    {"priority":1, "question":"測試問題", "type":"問題類型", "reason":"為什麼優先測這題", "focus":"觀察重點"}
  ]
}
topQuestions 必須剛好 10 筆，priority 為 1 到 10。`;
  const result = providerMode === 'gemini-only'
    ? await callGemini(env, requestKeys, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt)
    : await callOpenAI(env, requestKeys, env.OPENAI_BALANCED_MODEL || OPENAI_DEFAULTS.balanced, prompt);
  return coerceArray(result.topQuestions || result, 10);
}

async function runStep4(env, requestKeys, previousResults, providerMode) {
  const { step1, step3 } = previousResults;
  if (!step1 || !step3) throw new Error('Step 4 需要 Step 1 與 Step 3 結果。');
  const prompt = `
建立 AI 回答結果判讀規則。必須針對 9 種指定情境逐一輸出診斷規則。

指定情境：${JSON.stringify(STEP4_SCENARIOS)}
Step 1：${JSON.stringify(step1)}
Top 10 問題：${JSON.stringify(step3)}

輸出 JSON object：
{
  "rules": [
    {"scenario":"指定情境", "surface":"表面現象", "rootCause":"可能代表的真正問題", "optimizationTarget":"104 內容|105 品牌語境|商業決策頁", "nextAction":"下一步優化建議"}
  ]
}
rules 必須剛好 9 筆。`;
  const result = providerMode === 'gemini-only'
    ? await callGeminiWithFallback(env, requestKeys, env.GEMINI_SYNTHESIS_MODEL || GEMINI_DEFAULTS.synthesis, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt)
    : await callOpenAI(env, requestKeys, env.OPENAI_SYNTHESIS_MODEL || OPENAI_DEFAULTS.synthesis, prompt);
  return coerceArray(result.rules || result, 9);
}

function getQuestionForColdSimulation(question) {
  return {
    question: typeof question?.question === 'string' ? question.question : '',
    type: typeof question?.type === 'string' ? question.type : ''
  };
}

function extractBrandCandidates(step1) {
  const rawCandidates = [
    step1?.brandIdentity,
    step1?.sourceUrl ? getUrlHost(step1.sourceUrl) : '',
    step1?.sourceUrl ? getUrlHost(step1.sourceUrl).replace(/^www\./, '') : ''
  ];
  return rawCandidates
    .flatMap((value) => String(value || '').split(/[，,、｜|／/（）()：:\s]+/))
    .map((value) => value.trim())
    .filter((value) => value && value !== '目前資料不足' && value.length >= 2)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function textIncludesAny(text, candidates) {
  const normalizedText = String(text || '').toLowerCase();
  return candidates.some((candidate) => normalizedText.includes(String(candidate).toLowerCase()));
}

function filterNamesInText(names, text) {
  if (!Array.isArray(names)) return [];
  return names
    .map((name) => String(name || '').trim())
    .filter(Boolean)
    .filter((name, index, array) => array.indexOf(name) === index)
    .filter((name) => String(text || '').includes(name));
}

function normalizeChecklistRow(row, question, index, provider, platform, errorMessage = '', options = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const simulatedAnswer = typeof row?.simulatedAnswer === 'string' ? row.simulatedAnswer : '';
  const competitorsMentioned = filterNamesInText(row?.competitorsMentioned, simulatedAnswer);
  const competitorHit = competitorsMentioned.length > 0;
  const brandCandidates = Array.isArray(options.brandCandidates) ? options.brandCandidates : [];
  const answerMentionsKnownBrand = brandCandidates.length ? textIncludesAny(simulatedAnswer, brandCandidates) : Boolean(row?.aiMentionsBrand);
  const aiMentionsBrand = Boolean(row?.aiMentionsBrand) && answerMentionsKnownBrand;
  const aiCitesContent = options.hasCitationMetadata ? Boolean(row?.aiCitesContent) : false;
  const competitorDominanceRisk = competitorHit && (!aiMentionsBrand || !aiCitesContent);
  const rawScore = Number.isFinite(Number(row?.score)) ? Math.max(0, Math.min(100, Number(row.score))) : 0;
  const adjustedScore = competitorDominanceRisk ? Math.min(rawScore, 59) : rawScore;
  const evidenceSignals = Array.isArray(row?.evidenceSignals) ? row.evidenceSignals.filter(Boolean) : [];
  const failureReasons = Array.isArray(row?.failureReasons) ? row.failureReasons.filter(Boolean) : [];
  return {
    date: typeof row?.date === 'string' ? row.date : today,
    provider,
    platform,
    questionIndex: index + 1,
    question: typeof row?.question === 'string' ? row.question : question.question,
    type: typeof row?.type === 'string' ? row.type : question.type,
    aiCitesContent,
    aiMentionsBrand,
    aiDescribesBrandCorrectly: aiMentionsBrand && Boolean(row?.aiDescribesBrandCorrectly),
    simulatedAnswer,
    competitorHit,
    competitorDominanceRisk,
    competitorsMentioned,
    brandContext: typeof row?.brandContext === 'string' ? row.brandContext : '目前資料不足',
    initialJudgement: competitorDominanceRisk ? '嚴重缺口：競品出現但本品牌未被提及或引用' : (typeof row?.initialJudgement === 'string' ? row.initialJudgement : (errorMessage ? '檢核失敗' : '待人工複核')),
    evidenceSignals,
    failureReasons: competitorDominanceRisk
      ? [...failureReasons, '同一個回答中出現競品，但本品牌未被提及或未被引用']
      : failureReasons,
    gap: competitorDominanceRisk ? `同一個 ${platform} 回答出現其他品牌：${competitorsMentioned.join('、')}，但本品牌${!aiMentionsBrand ? '未被提及' : ''}${!aiMentionsBrand && !aiCitesContent ? '且' : ''}${!aiCitesContent ? '未被引用' : ''}。這代表品牌在該問題的 AI 語境中被競品壓過。` : (typeof row?.gap === 'string' ? row.gap : (errorMessage || '目前資料不足')),
    nextOptimization: typeof row?.nextOptimization === 'string' ? row.nextOptimization : '重新執行此題檢核，或縮短前序輸入後再產生檢核表。',
    score: adjustedScore,
    summary: typeof row?.summary === 'string' ? row.summary : (errorMessage || `第 ${index + 1} 題未取得完整 ${platform} 檢核結果。`)
  };
}

function getColdSimulationPrompt(question, platform) {
  const coldQuestion = getQuestionForColdSimulation(question);
  return `
你正在模擬一般使用者在全新 ${platform} 對話中提出單一問題時，模型可能會直接給出的回答。

限制：
1. 只能根據題目本身回答。
2. 不得假設你知道任何待檢查品牌、網站、前序分析或內部資料。
3. 不得宣稱已搜尋網路、已查看網站、已引用來源或已取得即時資料。
4. 若題目需要最新資訊但無法確認，回答要保持一般性。

測試平台：${platform}
問題：${coldQuestion.question}
問題類型：${coldQuestion.type}

輸出 JSON object：
{
  "simulatedAnswer":"完整但精簡的 ${platform} 回答，不要加入來源引用標記"
}`;
}

function getChecklistJudgePrompt(step1, step4, question, platform, simulatedAnswer) {
  return `
你是 AI 搜尋成效檢查員。請只根據下方「已固定的冷啟動回答」做事後判讀，輸出 12 欄成效檢查列。

重要限制：
1. 不得改寫、補寫、擴寫或重新產生冷啟動回答。
2. simulatedAnswer 必須原文放入輸出。
3. competitorsMentioned 只能來自 simulatedAnswer 內實際出現的其他品牌、公司、產品或服務名稱。
4. 不得使用 Step 1 的 differentiation 或任何預設競品清單來填 competitorsMentioned。
5. 本流程沒有官方搜尋 citation metadata，因此 aiCitesContent 必須填 false。
6. 若 simulatedAnswer 未實際出現本品牌名稱、網域或明確品牌身份，aiMentionsBrand 必須填 false。
7. 若只出現品類詞、通用名詞、地名或沒有品牌名稱，competitorsMentioned 必須為 []。
8. 只有在「competitorsMentioned 非空，且本品牌未被提及或未被引用」時，才判為嚴重缺口，score 必須小於 60。

日期：${new Date().toISOString().slice(0, 10)}
測試平台：${platform}
Step 1：${JSON.stringify(step1)}
本題：${JSON.stringify(question)}
判讀規則：${JSON.stringify(step4)}
已固定的冷啟動回答：${simulatedAnswer}

輸出 JSON object：
{
  "row": {
    "date":"YYYY-MM-DD",
    "platform":"${platform}",
    "question":"測試問題",
    "type":"問題類型",
    "simulatedAnswer":"必須與已固定的冷啟動回答完全相同",
    "aiCitesContent":false,
    "aiMentionsBrand":false,
    "aiDescribesBrandCorrectly":false,
    "competitorsMentioned":["只能填 simulatedAnswer 內實際出現的其他品牌名稱"],
    "brandContext":"AI 把品牌放在哪種語境；未提品牌時填未被提及",
    "initialJudgement":"初步判斷",
    "evidenceSignals":["從 simulatedAnswer 抽出的判斷線索，例如沒提品牌、只提品類、提到競品、缺少來源、描述錯誤"],
    "failureReasons":["為什麼這題被判定有問題，必須能讓使用者看懂判斷依據"],
    "gap":"對應缺口",
    "nextOptimization":"下一步優化方向",
    "score":0,
    "summary":"診斷摘要"
  }
}
score 為 0 到 100；若 competitorsMentioned 非空且 aiMentionsBrand=false 或 aiCitesContent=false，score 必須小於 60。`;
}

async function buildColdSimulatedAnswer(env, requestKeys, question, provider, platform) {
  const isGemini = provider === 'gemini' || provider === 'gemini-only';
  const prompt = getColdSimulationPrompt(question, platform);
  const result = isGemini
    ? await callGemini(env, requestKeys, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt)
    : await callOpenAI(env, requestKeys, env.OPENAI_BALANCED_MODEL || OPENAI_DEFAULTS.balanced, prompt);
  const simulatedAnswer = typeof result?.simulatedAnswer === 'string' ? result.simulatedAnswer.trim() : '';
  if (!simulatedAnswer) throw new Error(`${platform} 冷啟動模擬回答為空。`);
  return simulatedAnswer;
}

async function judgeChecklistRow(env, requestKeys, step1, step4, question, index, provider, platform, simulatedAnswer) {
  const isGemini = provider === 'gemini' || provider === 'gemini-only';
  const prompt = getChecklistJudgePrompt(step1, step4, question, platform, simulatedAnswer);
  const result = isGemini
    ? await callGemini(env, requestKeys, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt)
    : await callOpenAI(env, requestKeys, env.OPENAI_BALANCED_MODEL || OPENAI_DEFAULTS.balanced, prompt);
  const row = { ...(result.row || result), simulatedAnswer, aiCitesContent: false };
  return normalizeChecklistRow(row, question, index, provider.replace('-only', ''), platform, '', {
    brandCandidates: extractBrandCandidates(step1),
    hasCitationMetadata: false
  });
}

async function buildChecklistRow(env, requestKeys, step1, step4, question, index, provider) {
  const isGemini = provider === 'gemini';
  const isGeminiOnly = provider === 'gemini-only';
  const platform = isGemini || isGeminiOnly ? 'Gemini' : 'ChatGPT';
  const simulatedAnswer = await buildColdSimulatedAnswer(env, requestKeys, question, provider, platform);
  return judgeChecklistRow(env, requestKeys, step1, step4, question, index, provider, platform, simulatedAnswer);
}

async function runStep5(env, requestKeys, previousResults, providerMode) {
  const { step1, step3, step4 } = previousResults;
  if (!step1 || !step3 || !step4) throw new Error('Step 5 需要 Step 1、Step 3 與 Step 4 結果。');
  const questions = coerceArray(step3, 10);
  if (!questions.length) throw new Error('Step 5 找不到 Top 10 題目。');

  const jobs = questions.flatMap((question, index) => {
    if (providerMode === 'openai-only') return [{ question, index, provider: 'openai-only' }];
    if (providerMode === 'gemini-only') return [{ question, index, provider: 'gemini-only' }];
    return [
      { question, index, provider: 'openai' },
      { question, index, provider: 'gemini' }
    ];
  });

  const settled = await Promise.allSettled(
    jobs.map((job) => buildChecklistRow(env, requestKeys, step1, step4, job.question, job.index, job.provider))
  );

  return settled.map((entry, jobIndex) => {
    const job = jobs[jobIndex];
    const platform = job.provider === 'gemini' || job.provider === 'gemini-only' ? 'Gemini' : 'ChatGPT';
    if (entry.status === 'fulfilled') return entry.value;
    const message = entry.reason?.message || '模型檢核失敗。';
    console.error(JSON.stringify({ event: 'step5_row_failed', index: job.index, provider: job.provider, error: message }));
    return normalizeChecklistRow(null, job.question, job.index, job.provider.replace('-only', ''), platform, message);
  });
}

async function runStep6(env, requestKeys, previousResults, providerMode) {
  const { step1, step5 } = previousResults;
  if (!step1 || !step5) throw new Error('Step 6 需要 Step 1 與 Step 5 結果。');
  const prompt = `
根據 Step 5 缺口整理 30 天優化清單。必須覆蓋 5 類：內容可引用性修正、品牌身份與 Entity 修正、外部語境與第三方證詞修正、商業決策頁修正、下一輪 AI 搜尋測試建議。

Step 1：${JSON.stringify(step1)}
Step 5：${JSON.stringify(step5)}

輸出 JSON object：
{
  "roadmap": [
    {"category":"內容|定位|傳播|商業|搜尋", "task":"任務名稱", "detail":"具體執行細節", "priority":"P0|P1|P2", "effort":"預估工時", "sourceGap":"對應 Step 5 缺口"}
  ]
}
roadmap 至少 5 筆，且每類至少 1 筆。`;
  const result = providerMode === 'gemini-only'
    ? await callGeminiWithFallback(env, requestKeys, env.GEMINI_SYNTHESIS_MODEL || GEMINI_DEFAULTS.synthesis, env.GEMINI_BALANCED_MODEL || GEMINI_DEFAULTS.balanced, prompt)
    : await callOpenAI(env, requestKeys, env.OPENAI_SYNTHESIS_MODEL || OPENAI_DEFAULTS.synthesis, prompt);
  return coerceArray(result.roadmap || result);
}

async function dispatchStep(env, requestKeys, step, url, previousResults, providerMode) {
  switch (step) {
    case 1:
      return runStep1(env, requestKeys, url, providerMode);
    case 2:
      return runStep2(env, requestKeys, previousResults, providerMode);
    case 3:
      return runStep3(env, requestKeys, previousResults, providerMode);
    case 4:
      return runStep4(env, requestKeys, previousResults, providerMode);
    case 5:
      return runStep5(env, requestKeys, previousResults, providerMode);
    case 6:
      return runStep6(env, requestKeys, previousResults, providerMode);
    default:
      throw new Error(`未知的步驟: ${step}`);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const step = Number(body.step);
    if (!Number.isInteger(step) || step < 1 || step > 6) throw new Error('step 必須是 1 到 6 的整數。');
    const url = normalizeUrl(body.url);
    const previousResults = body.previousResults && typeof body.previousResults === 'object' ? body.previousResults : {};
    const requestKeys = body.keys && typeof body.keys === 'object' ? body.keys : {};
    const runId = typeof body.runId === 'string' && body.runId ? body.runId : (previousResults.runId || crypto.randomUUID());
    const providerMode = resolveProviderMode(context.env, requestKeys);
    const data = await dispatchStep(context.env, requestKeys, step, url, previousResults, providerMode);
    const dependencyRecords = getDependencyRecords(step, previousResults);
    const storage = await persistStepResult(context.env, { url, step, data, previousResults, runId, dependencyRecords, providerMode });
    return jsonResponse({ step, url, data, runId, providerMode, storage });
  } catch (error) {
    console.error(JSON.stringify({ event: 'analyze_failed', error: error.message, stack: error.stack }));
    return jsonResponse({ error: error.message }, 500);
  }
}

export const __testables = {
  extractBrandCandidates,
  getChecklistJudgePrompt,
  getColdSimulationPrompt,
  getQuestionForColdSimulation,
  normalizeChecklistRow
};
