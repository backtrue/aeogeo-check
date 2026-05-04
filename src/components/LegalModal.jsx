const UPDATED_AT = '2026-04-29';

const TERMS_SECTIONS = [
  {
    title: '1. 服務定位',
    body: 'Aeogeo Check 提供 AEO/GEO 診斷、AI 搜尋測試題庫、LLM 回答成效檢查與優化建議。服務輸出內容為分析輔助資料，不保證搜尋排名、AI 回答結果、商業轉換或第三方平台收錄。'
  },
  {
    title: '2. BYOK 與第三方模型',
    body: '本服務採 BYOK（Bring Your Own Key）模式。使用者自行提供 OpenAI、Gemini 或其他支援模型供應商的 API Key；至少提供一組即可執行分析，提供兩組時可啟用雙模型比較。API Key 儲存在使用者瀏覽器 localStorage，並只在使用者執行分析時送至本服務後端，用於呼叫對應模型供應商。使用者應自行確認其第三方模型帳號、用量、費用、權限與供應商條款。'
  },
  {
    title: '3. 使用者輸入與產出內容的使用授權',
    body: '使用者同意，本服務可蒐集、保存、處理並使用使用者於服務中輸入的網站 URL、網站擷取內容、Step 1 至 Step 6 的分析結果、Step 2 產生的 30 題題庫、Step 3 挑選題目、Step 5 的 LLM 模擬回答、判斷線索、缺口標記、分數、衍生統計與其他由系統產生的資料。上述資料可作為服務營運、品質控管、題庫建置、問題去重、產品分析、模型輸出評估、AEO/GEO 方法優化、功能開發、錯誤排查與內部研究使用。'
  },
  {
    title: '4. 題庫與分析資料的再利用',
    body: '使用者理解並同意，Step 2 產出的題目與其衍生資料可能被彙整、去識別化、分類、標註或統計，形成本服務的問題庫、分析樣本、產業問題模板或品質評估資料。除非另有書面約定，本服務得在不揭露使用者 API Key 與非必要識別資訊的前提下，持續保存並使用上述資料。'
  },
  {
    title: '5. 使用限制',
    body: '使用者不得提交其無權處理的機密資料、個人敏感資料、違法內容、惡意程式、侵害第三方權利的資料，或以自動化方式濫用服務資源。若使用者輸入第三方網站、品牌或競品資料，使用者應自行確保其使用方式具備合法依據。'
  },
  {
    title: '6. 智慧財產與權利歸屬',
    body: '使用者保留其原始輸入內容中依法享有的權利。本服務及其系統流程、介面、分析框架、題庫結構、評分規則、統計方法與彙整後資料庫，仍屬本服務或其權利人所有。使用者取得的是依本條款使用服務輸出結果的權利。'
  },
  {
    title: '7. 費用、可用性與變更',
    body: '本服務可能因第三方模型、Cloudflare、網路環境、API 額度、速率限制或維護而中斷、延遲或失敗。本服務得調整功能、資料保存策略、模型支援範圍與使用限制。'
  },
  {
    title: '8. 免責與責任限制',
    body: 'LLM 輸出可能不完整、不準確或隨模型版本變動。使用者應自行判斷是否採用分析建議。本服務不對使用者依輸出內容所做的商業、行銷、技術或法律決策負責。'
  }
];

const PRIVACY_SECTIONS = [
  {
    title: '1. 我們蒐集的資料',
    body: '我們可能蒐集使用者輸入的網站 URL、網站擷取文字、分析流程中的輸入與輸出、Step 2 題庫、Step 5 LLM 模擬回答與評分資料、瀏覽器 localStorage 中的服務狀態、技術紀錄、錯誤訊息、時間戳記、runId、R2 物件 key 與必要的請求中繼資料。'
  },
  {
    title: '2. API Key 的處理',
    body: 'OpenAI 或 Gemini API Key 預設儲存在使用者瀏覽器 localStorage。本服務後端在使用者執行分析時接收 API Key，用於呼叫指定第三方模型供應商；目前不將 API Key 寫入 R2 題庫或分析結果紀錄。使用者可透過瀏覽器清除 localStorage 或在介面更換 API Key。'
  },
  {
    title: '3. R2 儲存內容',
    body: '本服務會將分析步驟結果保存至 Cloudflare R2，包括每次執行的 step result、latest snapshot、run manifest、Step 2 question-bank set、單題 question record 與相關時間戳記。Step 2 與 Step 5 的重跑結果會以獨立 timestamp 保存，latest 僅指向最新結果。'
  },
  {
    title: '4. 使用目的',
    body: '我們使用資料以提供診斷服務、保存分析紀錄、建立與維護問題庫、去重與分類問題、比較 LLM 覆蓋率、改善判斷規則、偵錯、維護安全性、分析產品使用情況、提升服務品質與開發新功能。'
  },
  {
    title: '5. 第三方處理',
    body: '當使用者執行分析時，相關 prompt、網站內容摘要、題目與前序分析結果可能會傳送至使用者指定的第三方模型供應商，例如 OpenAI 或 Google Gemini。第三方供應商對資料的處理適用其自身條款與政策。'
  },
  {
    title: '6. 資料分享',
    body: '我們不出售使用者 API Key。除提供服務、基礎設施代管、法令要求、權利保護、資安調查或取得使用者同意外，不會任意揭露可識別使用者的資料。彙整、去識別化或統計後的題庫與分析資料可用於產品與研究目的。'
  },
  {
    title: '7. 保存期間',
    body: 'API Key 保存於使用者瀏覽器 localStorage，直到使用者清除或替換。R2 中的題庫、分析結果與衍生紀錄會基於服務營運、問題庫建置與產品分析目的保存，除非法令要求或本服務另行公告保存期限。'
  },
  {
    title: '8. 使用者選擇與聯絡',
    body: '使用者可停止使用服務、清除瀏覽器 localStorage、或要求刪除特定可識別紀錄。若需刪除 R2 中與特定 URL 或 runId 相關的資料，應提供足以定位資料的網址、時間與 runId。'
  }
];

function LegalContent({ type }) {
  const isTerms = type === 'terms';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  return (
    <div className="legal-document">
      <p className="legal-date">最後更新：{UPDATED_AT}</p>
      <p className="legal-lead">
        {isTerms
          ? '以下條款規範使用者使用 Aeogeo Check 的權利義務，特別是 BYOK、題庫保存、分析結果再利用與服務限制。'
          : '以下政策說明 Aeogeo Check 如何蒐集、使用、保存與分享服務資料，包含 BYOK API Key、R2 儲存與 LLM 分析資料。'}
      </p>
      {sections.map((section) => (
        <section key={section.title} className="legal-section">
          <h3 className="outfit">{section.title}</h3>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
}

export default function LegalModal({ type, onClose }) {
  if (!type) return null;
  const title = type === 'terms' ? '使用者條款' : '隱私權政策';
  return (
    <div className="legal-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="legal-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="legal-modal-header">
          <div>
            <span className="tag">Legal</span>
            <h2 className="outfit">{title}</h2>
          </div>
          <button type="button" className="step-item" onClick={onClose}>關閉</button>
        </div>
        <LegalContent type={type} />
      </div>
    </div>
  );
}
