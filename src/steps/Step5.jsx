import { useState } from 'react';
import { AlertTriangle, BarChart3, Bot, ChevronDown, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Zap } from 'lucide-react';

function statusForRow(row) {
  if (row?.severity === 'critical') return { label: '嚴重缺口', icon: ShieldAlert, className: 'critical' };
  if (row?.severity === 'warning') return { label: '待優化', icon: Zap, className: 'warn' };
  if (row?.severity === 'observe') return { label: '觀察項', icon: ShieldCheck, className: 'good' };
  const score = Number(row?.score) || 0;
  if (score >= 80) return { label: '觀察項', icon: ShieldCheck, className: 'good' };
  if (score >= 60) return { label: '待優化', icon: Zap, className: 'warn' };
  return { label: '嚴重缺口', icon: ShieldAlert, className: 'critical' };
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
    const citationRate = (providerRows.filter((row) => row.citationStatus === '有' || row.aiCitesContent).length / total) * 100;
    const criticalCount = providerRows.filter((row) => row.severity === 'critical').length;
    const warningCount = providerRows.filter((row) => row.severity === 'warning').length;
    const observeCount = providerRows.filter((row) => row.severity === 'observe').length;
    const averageScore = providerRows.reduce((sum, row) => sum + (Number(row.score) || 0), 0) / total;
    return { provider, total, mentionRate, correctRate, citationRate, criticalCount, warningCount, observeCount, averageScore };
  });
}

function getCriticalQuestions(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    if (row.severity !== 'critical') return;
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

function getEvidenceSignals(row) {
  const signals = Array.isArray(row.evidenceSignals) ? row.evidenceSignals.filter(Boolean) : [];
  const nearbyBrands = Array.isArray(row.nearbyBrands) ? row.nearbyBrands : row.competitorsMentioned;
  if (Array.isArray(nearbyBrands) && nearbyBrands.length) {
    signals.push(`鄰近品牌：${nearbyBrands.join('、')}`);
  }
  if (row.citationStatus) signals.push(`引用：${row.citationStatus}`);
  if (row.mentionStatus) signals.push(`提及：${row.mentionStatus}`);
  if (row.descriptionStatus) signals.push(`描述：${row.descriptionStatus}`);
  if (row.brandContext && row.brandContext !== '目前資料不足') signals.push(`品牌語境：${row.brandContext}`);
  return [...new Set(signals)];
}

function valueOrEmpty(value) {
  if (Array.isArray(value)) return value.length ? value.join('、') : '無';
  return value || '未判定';
}

function getRowKey(row, index = 0, prefix = 'row') {
  return [
    prefix,
    row.platform || row.provider || 'model',
    row.questionIndex || index + 1,
    row.question || 'question'
  ].join('::');
}

function getProblemReason(row) {
  if (row.answerPhenomenon) return row.answerPhenomenon;
  if (row.matchedStep4Rule?.rootCause) return row.matchedStep4Rule.rootCause;
  if (row.initialJudgement) return row.initialJudgement;
  return '目前資料不足，需重新檢查這題的 AI 回答現象。';
}

function ActionSummary({ row, compact = false }) {
  const items = [
    { label: '為什麼被判定有問題', value: row.userFacingProblem || getProblemReason(row) },
    { label: '對應缺口', value: row.userFacingGap || row.gap || '目前資料不足，尚未歸因到明確缺口。' },
    { label: '下一步', value: row.userFacingNextStep || row.nextOptimization || '先補齊可被 AI 引用與辨識的內容證據。' }
  ];

  return (
    <div className={`action-summary ${compact ? 'compact' : ''}`}>
      {items.map((item) => (
        <div key={item.label} className="action-summary-item">
          <span>{item.label}</span>
          <p>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function DetailToggle({ expanded, onClick }) {
  return (
    <button type="button" className="judgement-toggle" onClick={onClick} aria-expanded={expanded}>
      {expanded ? '收起判讀細節' : '查看判讀細節'}
      <ChevronDown size={16} />
    </button>
  );
}

function JudgementDetails({ row }) {
  const nearbyBrands = Array.isArray(row.nearbyBrands) ? row.nearbyBrands : row.competitorsMentioned;
  const evidenceSignals = getEvidenceSignals(row);

  return (
    <div className="judgement-details">
      {row.simulatedAnswer && (
        <div className="llm-answer-box">
          <span>LLM 模擬回答</span>
          <p>{row.simulatedAnswer}</p>
        </div>
      )}

      {evidenceSignals.length > 0 && (
        <div className="judgement-grid">
          <div>
            <span>判斷線索</span>
            <ul>
              {evidenceSignals.map((signal) => <li key={signal}>{signal}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="seo106-detail-grid">
        <p><strong>引用</strong>{valueOrEmpty(row.citationStatus)}</p>
        <p><strong>提及</strong>{valueOrEmpty(row.mentionStatus)}</p>
        <p><strong>描述</strong>{valueOrEmpty(row.descriptionStatus)}</p>
        <p><strong>鄰近品牌</strong>{valueOrEmpty(nearbyBrands)}</p>
        <p><strong>品牌語境</strong>{valueOrEmpty(row.brandContext)}</p>
        <p><strong>初步判斷</strong>{valueOrEmpty(row.initialJudgement)}</p>
        {row.matchedStep4Rule && (
          <p className="wide"><strong>對應 Step 4 規則</strong>{row.matchedStep4Rule.optimizationTarget}｜{row.matchedStep4Rule.rootCause}</p>
        )}
        {row.summary && <p className="wide"><strong>摘要</strong>{row.summary}</p>}
      </div>
    </div>
  );
}

export default function Step5({ data, onRefresh, loading }) {
  const [expandedRows, setExpandedRows] = useState(() => new Set());

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
  const toggleDetails = (key) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="animate-fade-in step5-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 5｜AI 搜尋成效檢查表</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>依 SEO106 的引用、提及、描述、鄰近四個 Check 判讀 AI 回答現象。</p>
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
                  <span>可確認引用</span>
                  <div className="coverage-bar"><i style={{ width: toPercent(stat.citationRate) }} /></div>
                  <b>{toPercent(stat.citationRate)}</b>
                </div>
                <div className="coverage-bar-row">
                  <span>正確描述率</span>
                  <div className="coverage-bar"><i style={{ width: toPercent(stat.correctRate) }} /></div>
                  <b>{toPercent(stat.correctRate)}</b>
                </div>
              </div>
              <div className="coverage-card-footer">
                <span>{stat.total} 筆檢核</span>
                <span className={stat.criticalCount > 0 ? 'danger-count' : ''}>{stat.criticalCount} 個嚴重缺口</span>
                <span>{stat.warningCount} 個待優化</span>
                <span>{stat.observeCount} 個觀察項</span>
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
              <p>以下只列出 SEO106 判為 critical 的問題；合理四無答案不列入紅色區塊。</p>
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
                  {item.rows.map((row, rowIndex) => {
                    const rowKey = getRowKey(row, rowIndex, `critical-${item.questionIndex || item.question}`);
                    const expanded = expandedRows.has(rowKey);
                    return (
                      <div key={rowKey} className="critical-model-card">
                        <div className="critical-model-card-head">
                          <PlatformBadge row={row} />
                          <strong>{row.score} 分</strong>
                        </div>
                        <ActionSummary row={row} compact />
                        <DetailToggle expanded={expanded} onClick={() => toggleDetails(rowKey)} />
                        {expanded && <JudgementDetails row={row} />}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="step5-results-list">
        {data.map((row, index) => {
          const status = statusForRow(row);
          const StatusIcon = status.icon;
          const rowKey = getRowKey(row, index, 'result');
          const expanded = expandedRows.has(rowKey);
          return (
            <div key={rowKey} className={`step5-result-card ${status.className}`}>
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

              <ActionSummary row={row} />
              <DetailToggle expanded={expanded} onClick={() => toggleDetails(rowKey)} />
              {expanded && <JudgementDetails row={row} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
