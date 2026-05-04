import { AlertTriangle, BarChart3, Bot, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Zap } from 'lucide-react';

function statusForScore(score) {
  if (score >= 80) return { label: '優良', color: '#10b981', icon: ShieldCheck, className: 'good' };
  if (score >= 60) return { label: '待優化', color: '#f59e0b', icon: Zap, className: 'warn' };
  return { label: '嚴重缺口', color: '#ef4444', icon: ShieldAlert, className: 'critical' };
}

function getProviders(rows) {
  const order = ['ChatGPT', 'Gemini'];
  const found = [...new Set(rows.map((row) => row.platform || row.provider).filter(Boolean))];
  return [...order.filter((name) => found.includes(name)), ...found.filter((name) => !order.includes(name))];
}

function toPercent(value) {
  return `${Math.round(value)}%`;
}

function getProviderStats(rows) {
  return getProviders(rows).map((provider) => {
    const providerRows = rows.filter((row) => (row.platform || row.provider) === provider);
    const total = providerRows.length || 1;
    const mentionRate = (providerRows.filter((row) => row.aiMentionsBrand).length / total) * 100;
    const correctRate = (providerRows.filter((row) => row.aiDescribesBrandCorrectly).length / total) * 100;
    const severeCount = providerRows.filter((row) => Number(row.score) < 60 || row.competitorDominanceRisk).length;
    const competitorHitCount = providerRows.filter((row) => row.competitorHit).length;
    const competitorDominanceCount = providerRows.filter((row) => row.competitorDominanceRisk).length;
    const averageScore = providerRows.reduce((sum, row) => sum + (Number(row.score) || 0), 0) / total;
    return { provider, total, mentionRate, correctRate, severeCount, competitorHitCount, competitorDominanceCount, averageScore };
  });
}

function getCriticalQuestions(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!row.competitorDominanceRisk) return;
    const key = row.question || `問題 ${row.questionIndex || grouped.size + 1}`;
    const current = grouped.get(key) || { question: key, type: row.type, questionIndex: row.questionIndex, rows: [] };
    current.rows.push(row);
    grouped.set(key, current);
  });
  return [...grouped.values()].sort((a, b) => (a.questionIndex || 99) - (b.questionIndex || 99));
}

function PlatformBadge({ row }) {
  const isGemini = (row.platform || '').toLowerCase().includes('gemini');
  const Icon = isGemini ? Sparkles : Bot;
  return (
    <span className={`platform-badge ${isGemini ? 'gemini' : 'chatgpt'}`}>
      <Icon size={14} /> {row.platform || 'ChatGPT'}
    </span>
  );
}

function getFailureReasons(row) {
  const explicitReasons = Array.isArray(row.failureReasons) ? row.failureReasons.filter(Boolean) : [];
  const inferredReasons = [];
  if (!row.aiMentionsBrand) inferredReasons.push('LLM 回答沒有提到本品牌');
  if (!row.aiCitesContent) inferredReasons.push('LLM 回答沒有引用或連回網站內容');
  if (!row.aiDescribesBrandCorrectly) inferredReasons.push('LLM 對品牌描述不完整或不正確');
  if (row.competitorDominanceRisk) inferredReasons.push('同一回答內有競品，但本品牌未被提及或引用');
  return [...new Set([...explicitReasons, ...inferredReasons])];
}

function getEvidenceSignals(row) {
  const signals = Array.isArray(row.evidenceSignals) ? row.evidenceSignals.filter(Boolean) : [];
  if (Array.isArray(row.competitorsMentioned) && row.competitorsMentioned.length) {
    signals.push(`同回答出現其他品牌：${row.competitorsMentioned.join('、')}`);
  }
  if (row.brandContext && row.brandContext !== '目前資料不足') signals.push(`品牌語境：${row.brandContext}`);
  return [...new Set(signals)];
}

export default function Step5({ data, onRefresh, loading }) {
  if (!data && !loading) return null;

  if (loading && !data) {
    return (
      <div className="flex-center" style={{ padding: '4rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>正在產出 ChatGPT / Gemini 雙模型檢核表...</p>
      </div>
    );
  }

  const stats = getProviderStats(data);
  const criticalQuestions = getCriticalQuestions(data);

  return (
    <div className="animate-fade-in step5-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 5｜AI 搜尋成效檢查表</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>同時比較 ChatGPT 與 Gemini 的品牌覆蓋率、描述正確率與嚴重缺口。</p>
        </div>
        <button type="button" onClick={() => onRefresh(5)} className="step-item" disabled={loading} style={{ background: 'rgba(255,255,255,0.05)' }}>
          <RefreshCw size={14} style={{ marginRight: '6px' }} /> {loading ? '分析中...' : '重新分析'}
        </button>
      </div>

      <section className="coverage-panel">
        <div className="coverage-panel-title">
          <BarChart3 size={18} />
          <h3 className="outfit">雙模型覆蓋率概覽</h3>
        </div>
        <div className="coverage-grid">
          {stats.map((stat) => (
            <article key={stat.provider} className="coverage-card">
              <div className="coverage-card-header">
                <span className={`platform-badge ${stat.provider === 'Gemini' ? 'gemini' : 'chatgpt'}`}>{stat.provider}</span>
                <strong>{Math.round(stat.averageScore)}</strong>
              </div>
              <div className="coverage-bars">
                <div className="coverage-bar-row">
                  <span>品牌提及率</span>
                  <div className="coverage-bar"><i style={{ width: toPercent(stat.mentionRate) }} /></div>
                  <b>{toPercent(stat.mentionRate)}</b>
                </div>
                <div className="coverage-bar-row">
                  <span>正確描述率</span>
                  <div className="coverage-bar"><i style={{ width: toPercent(stat.correctRate) }} /></div>
                  <b>{toPercent(stat.correctRate)}</b>
                </div>
              </div>
              <div className="coverage-card-footer">
                <span>{stat.total} 筆檢核</span>
                <span className={stat.severeCount > 0 ? 'danger-count' : ''}>{stat.severeCount} 個嚴重缺口</span>
                <span className={stat.competitorDominanceCount > 0 ? 'danger-count' : ''}>{stat.competitorDominanceCount} 個競品壓過</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {criticalQuestions.length > 0 && (
        <section className="critical-panel">
          <div className="critical-title">
            <AlertTriangle size={20} />
            <div>
              <h3 className="outfit">優先修正問題</h3>
              <p>以下只列出「競品被提及，但本品牌未被提及或未被引用」的問題；單純沒提任何商業品牌的回答不列入此清單。</p>
            </div>
          </div>
          <div className="critical-list">
            {criticalQuestions.map((item) => (
              <article key={item.question} className="critical-item">
                <div className="critical-question-row">
                  <span className="critical-index">#{item.questionIndex || '-'}</span>
                  <div>
                    <span className="tag">{item.type}</span>
                    <h4 className="outfit">{item.question}</h4>
                  </div>
                </div>
                <div className="critical-models">
                  {item.rows.map((row) => (
                    <div key={`${row.platform}-${row.question}`} className="critical-model-card">
                      <div className="critical-model-card-head">
                        <PlatformBadge row={row} />
                        <strong>{row.score} 分</strong>
                      </div>
                      {row.competitorDominanceRisk && <p className="competitor-hit-line">競品壓過：{row.competitorsMentioned.join('、')} 被提及，但本品牌未被提及或引用。</p>}
                      {row.simulatedAnswer && (
                        <div className="llm-answer-box">
                          <span>LLM 模擬回答</span>
                          <p>{row.simulatedAnswer}</p>
                        </div>
                      )}
                      <div className="judgement-grid">
                        <div>
                          <span>為什麼被判定有問題</span>
                          <ul>
                            {getFailureReasons(row).map((reason) => <li key={reason}>{reason}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span>判斷線索</span>
                          <ul>
                            {getEvidenceSignals(row).map((signal) => <li key={signal}>{signal}</li>)}
                          </ul>
                        </div>
                      </div>
                      <div className="critical-gap-box">
                        <span>對應缺口</span>
                        <p>{row.gap}</p>
                      </div>
                      <small>下一步：{row.nextOptimization}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="step5-results-list">
        {data.map((row, index) => {
          const status = statusForScore(Number(row.score) || 0);
          const StatusIcon = status.icon;
          return (
            <div key={`${row.platform}-${row.question}-${index}`} className={`step5-result-card ${status.className}`}>
              <div className="step5-result-head">
                <div>
                  <div className="step5-tags">
                    <PlatformBadge row={row} />
                    <span className="tag">Q{row.questionIndex || index + 1}</span>
                    <span className="tag">{row.type}</span>
                  </div>
                  <p className="outfit step5-question">{row.question}</p>
                </div>
                <div className={`score-badge ${status.className}`}>
                  <StatusIcon size={18} />
                  <span>{status.label}</span>
                  <strong>{row.score}</strong>
                </div>
              </div>

              <div className="metric-grid">
                <span><CheckCircle2 size={14} /> 引用內容：{row.aiCitesContent ? '是' : '否'}</span>
                <span><CheckCircle2 size={14} /> 提到品牌：{row.aiMentionsBrand ? '是' : '否'}</span>
                <span><CheckCircle2 size={14} /> 描述正確：{row.aiDescribesBrandCorrectly ? '是' : '否'}</span>
                <span className={row.competitorDominanceRisk ? 'competitor-hit-metric' : ''}>競品：{Array.isArray(row.competitorsMentioned) && row.competitorsMentioned.length ? row.competitorsMentioned.join('、') : '無'}</span>
              </div>

              <div className="step5-detail-grid">
                {row.competitorDominanceRisk && (
                  <p className="competitor-hit-detail"><strong>競品壓過</strong>{row.competitorsMentioned.join('、')} 出現在同一個 {row.platform} 模擬回答中，但本品牌未被提及或引用，嚴重性已提高。</p>
                )}
                {row.simulatedAnswer && <p><strong>模擬回答摘要</strong>{row.simulatedAnswer}</p>}
                <p><strong>品牌語境</strong>{row.brandContext}</p>
                <p><strong>初步判斷</strong>{row.initialJudgement}</p>
                <p className={status.className === 'critical' ? 'critical-text' : ''}><strong>對應缺口</strong>{row.gap}</p>
                <p><strong>下一步優化</strong>{row.nextOptimization}</p>
                <p><strong>摘要</strong>{row.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
