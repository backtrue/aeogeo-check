import { RefreshCw, Star } from 'lucide-react';

export default function Step3({ data, onRefresh, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在依商業價值與競爭關係篩選 Top 10...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 3｜最重要的 10 題</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>根據真實性、理解度、商業價值、競爭關係排序。</p>
        </div>
        <button type="button" onClick={() => onRefresh(3)} className="step-item" disabled={loading} style={{ background: 'rgba(255,255,255,0.05)' }}>
          <RefreshCw size={14} style={{ marginRight: '6px' }} /> {loading ? '重選中...' : '重新挑選 10 題'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {data.map((item, index) => (
          <div key={`${item.priority}-${item.question}`} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 24px', alignItems: 'center', padding: '1.5rem', gap: '1.5rem' }}>
            <div style={{ background: 'var(--accent-primary)', color: 'white', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {item.priority || index + 1}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5 }}>{item.type}</span>
              </div>
              <p className="outfit" style={{ fontSize: '1.1rem', margin: 0 }}>{item.question}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.6rem' }}>{item.reason}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>觀察重點：{item.focus}</p>
            </div>
            <Star size={18} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
