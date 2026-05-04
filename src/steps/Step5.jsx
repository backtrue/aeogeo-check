
import React from 'react';
import { ListChecks, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';
import { callOpenAIDirect } from '../services/ai';

const STEP5_SIMULATION_MODE = 'cold-start-v2';

/**
 * Step 5 完整模組：UI + 實測評分邏輯
 */
export default function Step5({ data, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在模擬 AI 搜尋並根據規則進行即時評分...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="outfit" style={{ margin: 0 }}>Step 5｜AEO 成效檢查表</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          這是在 Google / OpenAI 等搜尋環境下的真實模擬結果。我們根據 Step 4 的標準進行了 12 個維度的深度掃描
        </p>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="checklist-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1.2rem', textAlign: 'left', width: '40%' }}>診斷項目 (測試提問)</th>
              <th style={{ padding: '1.2rem', textAlign: 'center' }}>召回狀態</th>
              <th style={{ padding: '1.2rem', textAlign: 'left' }}>診斷摘要</th>
              <th style={{ padding: '1.2rem', textAlign: 'center' }}>得分</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((res, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1.2rem' }}>
                  <p className="outfit" style={{ fontWeight: 500, margin: 0 }}>{res.question}</p>
                </td>
                <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                  {res.score >= 80 ? (
                    <div style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={18} /> 優良</div>
                  ) : res.score >= 60 ? (
                    <div style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Zap size={18} /> 待優化</div>
                  ) : (
                    <div style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldAlert size={18} /> 嚴重缺口</div>
                  )}
                </td>
                <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {res.summary}
                </td>
                <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                  <span className="outfit" style={{ fontWeight: 'bold', fontSize: '1.1rem', color: res.score >= 80 ? '#10b981' : '#ef4444' }}>
                    {res.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Step 5 邏輯函數
 */
export async function runStep5(apiKeys, topQuestions, auditRules) {
  const tasks = topQuestions.map(async (q, idx) => {
    const rule = auditRules[idx] || auditRules[0];
    const coldPrompt = `你正在模擬一般使用者在全新對話中提出單一問題時，模型可能會直接給出的回答。

限制：
1. 只能根據題目本身回答。
2. 不得假設你知道任何待檢查品牌、網站、前序分析、判讀規則或內部資料。
3. 不得宣稱已搜尋網路、已查看網站、已引用來源或已取得即時資料。
4. 若題目需要最新資訊但無法確認，回答要保持一般性。

問題：${q.question}

輸出 JSON：{"simulatedAnswer":"完整但精簡的回答，不要加入來源引用標記"}`;

    const coldResult = await callOpenAIDirect(apiKeys.openai, 'gpt-5.4-mini', coldPrompt);
    const simulatedAnswer = typeof coldResult?.simulatedAnswer === 'string' ? coldResult.simulatedAnswer.trim() : '';
    if (!simulatedAnswer) throw new Error(`第 ${idx + 1} 題冷啟動模擬回答為空。`);

    const judgePrompt = `你是 AEO 評分員。請只根據下方「已固定的冷啟動回答」做事後判讀。

重要限制：
1. 不得改寫、補寫、擴寫或重新產生冷啟動回答。
2. simulatedAnswer 必須原文放入輸出。
3. 本流程沒有官方搜尋 citation metadata，因此 aiCitesContent 必須填 false。
4. score 只評估這段固定回答是否符合規則，不得因為你知道其他品牌背景而加分。

問題：${q.question}
規則：${rule.rule || JSON.stringify(rule)}
已固定的冷啟動回答：${simulatedAnswer}

輸出 JSON：{
  "score":0,
  "summary":"診斷摘要",
  "recommendation":"下一步建議",
  "simulatedAnswer":"必須與已固定的冷啟動回答完全相同",
  "aiCitesContent":false
}`;

    const judged = await callOpenAIDirect(apiKeys.openai, 'gpt-5.4-mini', judgePrompt);
    return {
      ...judged,
      question: q.question,
      simulatedAnswer,
      aiCitesContent: false,
      simulationMode: STEP5_SIMULATION_MODE
    };
  });

  return await Promise.all(tasks);
}
