# Aeogeo Check - 系統架構說明 (Architecture)

## 1. 系統目標
本系統為一套「AI 搜尋成效診斷顧問」，旨在通過自動化爬蟲與多模型診斷 (GPT/Gemini)，分析品牌在生成式搜尋引擎 (AEO/GEO) 中的表現，並產出可落地的優化建議。

## 2. 核心架構：模組化管線 (Modular Pipeline)
系統採用 **UI 與 業務邏輯完全解耦** 的架構。所有的診斷邏輯都封裝在 `src/services/steps/` 檔案夾中，每個步驟對應一個獨立的服務。

### 2.1 服務與組件映射表
| 步驟 | 服務層 (Service) | 前端組件 (Component) | 核心職責 |
| :--- | :--- | :--- | :--- |
| **Step 1** | `step1.js` | `BrandSummary.jsx` | 品牌身份與 DNA 判斷 |
| **Step 2** | `step2.js` | `QuestionBank.jsx` | 30 題去品牌化搜尋題庫生成 |
| **Step 3** | `step3.js` | `TopTenQuestions.jsx` | 戰略篩選 Top 10 核心測試點 |
| **Step 4** | `step4.js` | `InterpretationRules.jsx` | 9 種情境的判讀規則與建議 |
| **Step 5** | `step5.js` | `Checklist.jsx` | 模擬實測、AI 裁判打分與 12 欄檢查表 |
| **Step 6** | `step6.js` | `Roadmap.jsx` | 30 天落地執行優化清單 |

## 3. 數據流向 (Data Flow)
1. **觸發**：使用者輸入 URL，`App.jsx` 調用 `fetchSiteContent` 抓取網頁。
2. **Step 1**：傳入網頁文本，AI 返回 `step1Data`。
3. **Step 2-6**：後續步驟會根據 `App.jsx` 的狀態管理，將前一步的結果作為 Input 傳給下一步。
4. **持久化**：所有 `result` 物件會通過 `saveToDB` 存入 `localStorage`，Key 為 `aeo_cache_{url}`。

## 4. AI 策略 (AI Strategy)
- **分析深度**：Step 1 採用並行分析模式（GPT-mini + Gemini），再由 GPT-5.4 進行合成。
- **物理隔離**：Step 2 在出題前會進行數據脫敏，剔除 `brandName` 以保證診斷中立性。
- **自動化實測**：Step 5 執行真實的 API 調用來模擬使用者搜尋。

## 5. 目錄結構
```text
src/
├── components/          # UI 展示組件 (純顯示邏輯)
├── services/
│   ├── ai.js           # 模型接口封裝 (OpenAI/Gemini)
│   └── steps/          # 步驟核心邏輯 (業務邏輯層)
├── utils/
│   └── helpers.js      # 工具函數 (爬蟲、格式化、資料庫)
└── App.jsx             # 狀態調度與總控台
```

## 6. 規範約束
所有開發必須遵循 `AEO_PIPELINE_SPEC.md` 中定義的欄位名稱與輸出格式。
