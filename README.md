# Aeogeo Check

AEO/GEO 成效診斷工具。輸入網站 URL 後，系統透過 Cloudflare Pages Function 執行 6 步診斷管線，前端只負責狀態與報告呈現。

## 技術棧

- Vite + React
- Cloudflare Pages Functions：`functions/api/analyze.js`
- OpenAI Chat Completions API
- Gemini Generate Content API

## 執行流程

1. 前端送出 `POST /api/analyze`，包含 `url`、`step`、`previousResults`。
2. Cloudflare Function 依 step 執行對應診斷。
3. 前端把每步結果寫入 `localStorage` 快取，key 為 `aeo_cache_{url}`。
4. 後端把每個成功 step 寫入 R2 bucket `aeogeo-check-data`，binding 為 `AEO_STORAGE`。
5. Step 2 的 30 題會額外寫入 `question-bank/` 路徑，作為長期問題庫。
6. 此服務採 BYOK。API Key 由使用者在前端輸入，存於該瀏覽器的 localStorage；每次分析會隨同源 request 傳到 Cloudflare Pages Function 執行。

## R2 儲存

R2 binding：

```toml
[[r2_buckets]]
binding = "AEO_STORAGE"
bucket_name = "aeogeo-check-data"
```

主要物件路徑：

- `runs/{host}/{runId}/step-{n}.json`：每次診斷流程的逐步結果
- `latest/{host}/step-{n}.json`：每個 host 最新 step 結果
- `question-bank/sets/{host}/{createdAt}-{runId}.json`：Step 2 產出的 30 題集合
- `question-bank/questions/{sha256}.json`：單題 hash 版本，供未來去重與建題庫
- `question-bank/by-host/{host}/{sha256}.json`：依 host 查詢單題

## 環境變數

BYOK 模式下，使用者可在前端輸入下列 key，系統會保存於該瀏覽器 localStorage：

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

Cloudflare Pages / Pages Functions 也可設定同名 Secrets 作為 fallback。可選模型覆寫：

- `OPENAI_SYNTHESIS_MODEL`，預設 `gpt-5.4`
- `OPENAI_BALANCED_MODEL`，預設 `gpt-5.4-mini`
- `OPENAI_EXTRACTION_MODEL`，預設 `gpt-5.4-nano`
- `GEMINI_SYNTHESIS_MODEL`，預設 `gemini-2.5-pro`
- `GEMINI_BALANCED_MODEL`，預設 `gemini-2.5-flash`
- `GEMINI_EXTRACTION_MODEL`，預設 `gemini-2.5-flash`

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run preview
```

## 規格對應

規格來源為 `AEO_PIPELINE_SPEC.md`。

- Step 1：輸出 `brandIdentity`、`offerings`、`categories`、`audiences`、`differentiation`、`evidence`
- Step 2：輸出 30 題 `{type, question, check, ideal, gap}`
- Step 3：輸出 10 題 `{priority, question, type, reason, focus}`
- Step 4：輸出 9 種情境 `{scenario, surface, rootCause, optimizationTarget, nextAction}`
- Step 5：同時輸出 ChatGPT 與 Gemini 的 12 欄檢查表，另保留 `score`、`summary`、`provider` 供 UI 統計覆蓋率
- Step 6：輸出 30 天優化清單 `{category, task, detail, priority, effort, sourceGap}`
