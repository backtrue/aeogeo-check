
import React from 'react';
import { Search, Info, HelpCircle } from 'lucide-react';
import { callGeminiDirect } from '../services/ai';

/**
 * Step 2 完整模組：UI + 30 題測試題目生成邏輯
 */
export default function Step2({ data, onRefresh, loading }) {
  if (!data && !loading) return null;

  if (loading) {
    return (
      <div className="flex-center" style={{ padding: '4rem', minHeight: '400px' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在根據最新 Facts 生成 30 個搜尋意圖測試題...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 2｜AI 搜尋意圖測試題庫</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            基於 Step 1 的事實提取，模擬真實使用者的 30 個中立提問
          </p>
        </div>
        <button onClick={() => onRefresh(2)} className="step-item" disabled={loading} style={{ background: 'rgba(255,255,255,0.05)' }}>
          {loading ? '生成中...' : '重新生成題庫'}
        </button>
      </div>

      <div className="grid-2">
        {data?.map((item, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span className="tag">{item.type}</span>
              <HelpCircle size={16} style={{ opacity: 0.3 }} />
            </div>
            <p className="outfit" style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem' }}>{item.question}</p>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
              <strong>檢測重點：</strong> {item.check}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Step 2 邏輯函數
 */
export async function runStep2(apiKeys, step1Data) {
  const { whatItDoes, searchThemes, userPersonas, hardcoreFacts } = step1Data;
  const prompt = `你是一位「搜尋行為研究員」。請針對以下事實設計 30 個中立搜尋提問：\n內容與規格：${whatItDoes}\n主題：${searchThemes}\n受眾意圖：${userPersonas}\n證據數據：${hardcoreFacts}\n輸出 JSON 陣列 [{type, question, check, ideal, gap}]，確保問題純粹模擬使用者搜尋行為，禁止包含品牌推廣字眼。`;
  
  const result = await callGeminiDirect(apiKeys.gemini, 'gemini-2.5-flash', prompt);
  return Array.isArray(result) ? result : (Object.values(result).find(v => Array.isArray(v)) || []);
}
