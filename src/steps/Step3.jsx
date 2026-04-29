
import React from 'react';
import { BarChart3, Star } from 'lucide-react';
import { callOpenAIDirect } from '../services/ai';

/**
 * Step 3 完整模組：UI + 核心 10 題挑選邏輯
 */
export default function Step3({ data, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在從 30 題中精選 10 題最具代表性的題目...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="outfit" style={{ margin: 0 }}>Step 3｜精選核心 10 題</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          這 10 題將作為最終診斷的依據，涵蓋從基礎認知到購買決策的全路徑
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {data?.map((item, idx) => (
          <div key={idx} className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', gap: '1.5rem' }}>
            <div style={{ background: 'var(--accent-primary)', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0 }}>
              {idx + 1}
            </div>
            <div style={{ flexGrow: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5 }}>{item.type}</span>
              </div>
              <p className="outfit" style={{ fontSize: '1.1rem', margin: 0 }}>{item.question}</p>
            </div>
            <Star size={18} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Step 3 邏輯函數
 */
export async function runStep3(apiKeys, step1Data, step2Data) {
  const prompt = `你是 AEO 診斷專家。請從以下 30 題中，針對「${step1Data.brandIdentity}」挑選出最具代表性、最能測出市場覆蓋率的 10 題。\n\n題目池：${JSON.stringify(step2Data)}\n\n輸出 JSON 陣列，直接回傳挑選出的 10 個物件即可。`;
  
  const result = await callOpenAIDirect(apiKeys.openai, 'gpt-5.4-mini', prompt);
  return Array.isArray(result) ? result.slice(0, 10) : [];
}
