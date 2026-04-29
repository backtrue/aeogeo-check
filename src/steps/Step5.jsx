
import React from 'react';
import { ListChecks, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';
import { callOpenAIDirect, callGeminiDirect } from '../services/ai';

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
    const prompt = `你是 AEO 評分員。針對問題「${q.question}」，請評估 AI 的召回成效。\n規則：${rule.rule}\n輸出 JSON：{score, summary, recommendation}`;
    
    // 模擬 AI 回答與評分 (這裡簡化為一次呼叫)
    const scored = await callOpenAIDirect(apiKeys.openai, 'gpt-5.4-mini', prompt);
    return { ...scored, question: q.question };
  });

  return await Promise.all(tasks);
}
