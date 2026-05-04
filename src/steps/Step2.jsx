import { HelpCircle } from 'lucide-react';

export default function Step2({ data, onRefresh, loading }) {
  if (!data && !loading) return null;

  if (loading) {
    return (
      <div className="flex-center" style={{ padding: '4rem', minHeight: '400px' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在生成 30 題 AI 搜尋測試題庫...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 2｜AI 搜尋測試題庫</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>定義、比較、方法、情境、推薦、決策 6 類共 30 題。</p>
        </div>
        <button type="button" onClick={() => onRefresh(2)} className="step-item" disabled={loading} style={{ background: 'rgba(255,255,255,0.05)' }}>
          {loading ? '生成中...' : '重新生成題庫'}
        </button>
      </div>

      <div className="grid-2">
        {data.map((item, index) => (
          <div key={`${item.type}-${index}`} className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span className="tag">{item.type}</span>
              <HelpCircle size={16} style={{ opacity: 0.3 }} />
            </div>
            <p className="outfit" style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem' }}>{item.question}</p>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
              <strong>檢測重點：</strong> {item.check}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.8rem' }}>
              <strong>缺口訊號：</strong> {item.gap}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
