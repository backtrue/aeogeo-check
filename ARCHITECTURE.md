# Aeogeo Check - 系統架構說明

## 1. 系統目標

本系統是一套 AEO/GEO 搜尋成效診斷工具，透過網站內容抓取、多模型分析與規格化診斷輸出，產出可落地的 AI 搜尋優化建議。

## 2. 核心架構

系統採用 server-side pipeline：前端只處理輸入、步驟切換、快取與報告呈現；所有 AI 呼叫、網站抓取、schema 生成都集中在 Cloudflare Pages Function。

```text
Browser React UI
  -> src/services/pipeline.js
  -> POST /api/analyze
  -> functions/api/analyze.js
  -> OpenAI / Gemini
  -> R2 AEO_STORAGE
```

## 3. 目錄結構

```text
functions/
└── api/
    └── analyze.js          # 6 步診斷管線、AI 呼叫、網站抓取、錯誤處理
src/
├── AeoDashboard.jsx        # 前端總控台
├── components/             # 純展示元件
├── hooks/
│   └── usePipeline.js      # 前端狀態、快取、錯誤狀態
├── services/
│   └── pipeline.js         # 呼叫 /api/analyze
├── steps/                  # Step 1-6 報告呈現元件
└── utils/
    └── helpers.js          # URL 正規化與 localStorage 快取
```

## 4. Step 資料契約

| Step | 輸出 |
| :--- | :--- |
| Step 1 | `brandIdentity`, `offerings`, `categories`, `audiences`, `differentiation`, `evidence` |
| Step 2 | 30 題 `{type, question, check, ideal, gap}`，並寫入 R2 `question-bank/` |
| Step 3 | 10 題 `{priority, question, type, reason, focus}` |
| Step 4 | 9 種情境 `{scenario, surface, rootCause, optimizationTarget, nextAction}` |
| Step 5 | ChatGPT/Gemini 雙模型 12 欄檢查表：日期、平台、問題、問題類型、引用、品牌提及、描述正確性、競品、語境、初判、缺口、方向 |
| Step 6 | 30 天清單 `{category, task, detail, priority, effort, sourceGap}` |

## 5. 安全邊界

- OpenAI/Gemini API key 採 BYOK，預設存於使用者瀏覽器 `localStorage` 的 `aeo_keys`。
- 每次分析 request 會把 BYOK key 傳到同源 `/api/analyze`，由 server-side pipeline 呼叫 OpenAI/Gemini。
- 若 request 未帶 BYOK key，Function 可 fallback 到 Cloudflare Secrets：`OPENAI_API_KEY`、`GEMINI_API_KEY`。
- 診斷結果另以 `aeo_cache_{url}` 快取於 localStorage。
- 每個成功 step 會寫入 R2 bucket `aeogeo-check-data`。
- Step 2 的 30 題會寫入 `question-bank/sets/` 與 `question-bank/questions/`，作為長期問題庫。
- `/api/analyze` 會驗證 `url` 與 `step`，並以結構化錯誤回傳。

## 6. 外部依據

- Cloudflare Pages Functions 使用 file-based routing，`functions/api/analyze.js` 對應 `/api/analyze`：https://developers.cloudflare.com/pages/functions/routing/
- Cloudflare Pages Functions 的 Secrets 可從 `context.env` 存取：https://developers.cloudflare.com/pages/functions/bindings/
- Vite 官方文件指出 client bundle 只能安全使用非敏感公開變數，敏感值不應暴露到前端：https://vite.dev/guide/env-and-mode/
- OpenAI 官方模型文件列出可用模型與 API 使用方式：https://platform.openai.com/docs/models
- Gemini Structured Output 官方文件支援 JSON structured output：https://ai.google.dev/gemini-api/docs/structured-output
