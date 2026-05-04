import { Rocket, Target, FileText, Share2, Search, Settings, Clock, AlertCircle } from 'lucide-react';

const ICON_MAP = {
  定位: Target,
  內容: FileText,
  傳播: Share2,
  技術: Settings,
  搜尋: Search,
  商業: Rocket
};

const PRIORITY_ORDER = ['P0', 'P1', 'P2'];

function getPriorityBuckets(items) {
  const buckets = new Map(PRIORITY_ORDER.map((priority) => [priority, []]));
  items.forEach((item, index) => {
    const priority = PRIORITY_ORDER.includes(item.priority) ? item.priority : 'P2';
    buckets.get(priority).push({ ...item, originalIndex: index });
  });
  return [...buckets.entries()].filter(([, tasks]) => tasks.length > 0);
}

function summarize(items) {
  return {
    total: items.length,
    p0: items.filter((item) => item.priority === 'P0').length,
    p1: items.filter((item) => item.priority === 'P1').length,
    p2: items.filter((item) => item.priority === 'P2').length,
    categories: [...new Set(items.map((item) => item.category).filter(Boolean))].join('、') || '未分類'
  };
}

export default function Step6({ data, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在整理 30 天優化清單...</p>
      </div>
    );
  }

  const summary = summarize(data);
  const buckets = getPriorityBuckets(data);

  return (
    <div className="animate-fade-in roadmap-view">
      <div className="roadmap-hero">
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 6｜30 天優化清單</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.6rem' }}>依優先級整理成可執行 roadmap，從最高影響缺口先處理。</p>
        </div>
        <div className="roadmap-summary-grid">
          <div className="roadmap-stat"><strong>{summary.total}</strong><span>任務</span></div>
          <div className="roadmap-stat urgent"><strong>{summary.p0}</strong><span>P0</span></div>
          <div className="roadmap-stat"><strong>{summary.p1}</strong><span>P1</span></div>
          <div className="roadmap-stat"><strong>{summary.p2}</strong><span>P2</span></div>
        </div>
      </div>

      <div className="roadmap-focus-strip">
        <span className="tag">涵蓋面向</span>
        <p>{summary.categories}</p>
      </div>

      <div className="roadmap-lanes">
        {buckets.map(([priority, tasks]) => (
          <section key={priority} className="roadmap-lane">
            <div className="roadmap-lane-header">
              <div>
                <span className={`priority-pill ${priority.toLowerCase()}`}>{priority}</span>
                <h3 className="outfit">{priority === 'P0' ? '立即處理' : priority === 'P1' ? '本週排程' : '本月優化'}</h3>
              </div>
              <span>{tasks.length} 項</span>
            </div>

            <div className="roadmap-task-list">
              {tasks.map((item) => {
                const Icon = ICON_MAP[item.category] || Rocket;
                return (
                  <article key={`${item.task}-${item.originalIndex}`} className="roadmap-task-card">
                    <div className="task-index">{String(item.originalIndex + 1).padStart(2, '0')}</div>
                    <div className="task-main">
                      <div className="task-title-row">
                        <div className="task-icon"><Icon size={18} /></div>
                        <div>
                          <span className="task-category">{item.category || '未分類'}</span>
                          <h4 className="outfit">{item.task}</h4>
                        </div>
                      </div>

                      <div className="task-section action">
                        <strong>執行動作</strong>
                        <p>{item.detail}</p>
                      </div>

                      {item.sourceGap && (
                        <div className="task-section gap">
                          <AlertCircle size={15} />
                          <p><strong>對應缺口：</strong>{item.sourceGap}</p>
                        </div>
                      )}

                      <div className="task-meta-row">
                        <span className="task-meta"><Clock size={14} /> {item.effort || '未估工時'}</span>
                        <span className={`priority-pill ${priority.toLowerCase()}`}>{priority}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
