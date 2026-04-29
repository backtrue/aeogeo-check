
import React from 'react';
import { Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { callOpenAIDirect } from '../services/ai';

/**
 * Step 4 完整模組：UI + 診斷判讀規則制定
 */
export default function Step4({ data, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在根據品牌 DNA 制定 AI 判讀標準...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="outfit" style={{ margin: 0 }}>Step 4｜診斷判讀規則</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          這是系統用來評分 AI 回答的標準。若 AI 沒提到以下要點，即判定為內容覆蓋缺口
        </p>
      </div>

      <div className="grid-2">
        {data?.map((rule, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '6px', borderRadius: '6px' }}>
                <Cpu size={18} />
              </div>
              <span className="outfit" style={{ fontWeight: 600 }}>規則 {idx + 1}</span>
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>{rule.rule}</p>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#10b981' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span><strong>及格標準：</strong> {rule.pass_criteria}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#f59e0b' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span><strong>扣分關鍵：</strong> {rule.fail_trigger}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Step 4 邏輯函數
 */
export async function runStep4(apiKeys, step1Data, step3Data) {
  const prompt = `你是一位資深診斷師。請針對「${step1Data.brandIdentity}」及其核心優勢「${step1Data.differentiation}」，為以下 10 題制定「判讀規則」。\n\n題目清單：${JSON.stringify(step3Data)}\n\n輸出 JSON 陣列，每個物件包含：rule (診斷規則), pass_criteria (及格標準), fail_trigger (扣分關鍵)。`;
  
  const result = await callOpenAIDirect(apiKeys.openai, 'gpt-5.4', prompt);
  return Array.isArray(result) ? result : [];
}
