
import React from 'react';

function InfoCard({ title, content, icon }) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
        {Array.isArray(content) ? content.join(', ') : (typeof content === 'object' ? JSON.stringify(content) : content)}
      </div>
    </div>
  );
}

export default InfoCard;
