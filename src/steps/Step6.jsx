
import React from 'react';
import { Rocket, Target, FileText, Share2, Search, Settings } from 'lucide-react';
import { callOpenAIDirect } from '../services/ai';

const ICON_MAP = {
  '定位': Target,
  '內容': FileText,
  '傳播': Share2,
  '技術': Settings,
  '搜尋': Search
};

/**
 * Step 6 完整模組：UI + 優化路徑生成邏輯
 */
export default function Step6({ data, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在根據診斷結果，為您量身打造 30 天 AEO 優化路徑...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="outfit" style={{ margin: 0 }}>Step 6｜30 天 AEO 優化路徑規劃</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          基於 Step 5 的缺口分析，這是您未來一個月最關鍵的執行清單。
        </p>
      </div>

      <div className="grid-2">
        {data?.map((item, idx) => {
          const Icon = ICON_MAP[item.category] || Rocket;
          return (
            <div key={idx} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '10px', borderRadius: '10px' }}>
                  <Icon size={20} />
                </div>
                <h3 className="outfit" style={{ margin: 0, fontSize: '1.25rem' }}>{item.task}</h3>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  <strong>執行細節：</strong> {item.detail}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span className="tag" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>{item.priority}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>預計耗時：{item.effort}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Step 6 邏輯函數
 */
export async function runStep6(apiKeys, step1Data, step5Results) {
  const prompt = `你是 AEO 增長顧問。針對「${step1Data.whoIsIt}」在實測中發現的缺口：${JSON.stringify(step5Results)}，請規劃 5 個具體的 30 天優化任務。\n\n輸出 JSON 陣列 [{category, task, detail, priority, effort}]`;
  
  const result = await callOpenAIDirect(apiKeys.openai, 'gpt-5.4', prompt);
  return Array.isArray(result) ? result : [];
}
