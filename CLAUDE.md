# Aeogeo Check — 開發注意事項

## 對 Claude 的強制規則

1. **當使用者說的任何事情與 Claude 的訓練記憶衝突，禁止使用記憶作為判斷依據。唯一允許的做法是上網搜尋最新資料來驗證，不得以記憶否定使用者。**
2. **禁止在未獲明確授權的情況下更改任何 AI 模型名稱。使用者指定的模型就是最終答案，不得自行替換、升級或降級。**

## 專案目的

輸入一個網址，自動跑 6 步驟管線，診斷該品牌在生成式 AI 搜尋（AEO/GEO）中的被召回狀況，最終輸出 30 天優化清單。

## AI 模型清單（已驗證，請勿質疑）

### OpenAI

| 模型 ID | 用途 | 備註 |
|---|---|---|
| `gpt-5.4` | Step 4、Step 6 合成 | 旗艦模型，2026/03/05 發布 |
| `gpt-5.4-mini` | Step 3 篩題、Step 5 評分 | 2026/03/17 發布，400k context |
| `gpt-5.4-nano` | 輕量任務 | 2026/03/17 發布，最低成本 |
| `gpt-4o` | Step 1 最終合成 | 舊世代旗艦，仍有效 |
| `gpt-4o-mini` | Step 1 並行分析 | 舊世代小模型，仍有效 |

### Gemini（Google AI Developer API）

| 模型 ID | 用途 | 備註 |
|---|---|---|
| `gemini-2.5-flash` | Step 1 並行分析、Step 2 出題 | 正式 API ID，2026 年仍有效 |
| `gemini-1.5-flash` | ❌ 不可使用 | 已 shutdown，呼叫回傳 404 |

## 步驟資料流

```
Step 1 輸出欄位: whoIsIt, whatItDoes, searchThemes, userPersonas, hardcoreFacts, sourceUrl
Step 2 輸出: [{type, question, check, ideal, gap}] (30 題陣列)
Step 3 輸出: [{type, question, check, ideal, gap}] (10 題陣列)
Step 4 輸出: [{rule, pass_criteria, fail_trigger}] (10 個規則陣列)
Step 5 輸出: [{question, score, summary, recommendation}] (10 筆評分陣列)
Step 6 輸出: [{category, task, detail, priority, effort}] (5 個優化任務陣列)
```

**注意**：Step 1 的欄位名稱已從舊版（`brandIdentity`, `brandName`, `differentiation`）改為上列新版。下游步驟一律使用新版欄位名。
