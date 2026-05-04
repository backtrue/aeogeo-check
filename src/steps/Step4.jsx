import { Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Step4({ data, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在建立 9 種情境判讀規則...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="outfit" style={{ margin: 0 }}>Step 4｜AI 回答結果判讀規則</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>針對沒引用、沒來源、沒提品牌、描述錯誤、只提競品等情境做診斷。</p>
      </div>

      <div className="grid-2">
        {data.map((rule, index) => (
          <div key={`${rule.scenario}-${index}`} className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(214, 168, 79, 0.12)', color: 'var(--accent-primary)', padding: '6px', borderRadius: '6px' }}>
                <Cpu size={18} />
              </div>
              <span className="outfit" style={{ fontWeight: 600 }}>情境 {index + 1}｜{rule.scenario}</span>
            </div>
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>表面現象：</strong> {rule.surface}
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#f59e0b' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span><strong>真正問題：</strong> {rule.rootCause}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#10b981' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span><strong>優化指向：</strong> {rule.optimizationTarget}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>下一步：</strong> {rule.nextAction}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
