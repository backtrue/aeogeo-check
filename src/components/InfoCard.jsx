function InfoCard({ title, content, icon }) {
  const renderedContent = Array.isArray(content) ? content.join('\n') : (typeof content === 'object' && content !== null ? JSON.stringify(content, null, 2) : content);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
        {renderedContent || '目前資料不足'}
      </div>
    </div>
  );
}

export default InfoCard;
