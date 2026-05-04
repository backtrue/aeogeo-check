import { useEffect, useRef, useState } from 'react';
import { Search, BarChart3, ListChecks, Rocket, Globe, Cpu, ChevronRight, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import LegalModal from './components/LegalModal';
import { usePipeline } from './hooks/usePipeline';

const STEPS = [
  { id: 1, title: '品牌與主題', icon: Globe },
  { id: 2, title: 'AI 搜尋測試題庫', icon: Search },
  { id: 3, title: '核心 10 題', icon: BarChart3 },
  { id: 4, title: '判讀規則', icon: Cpu },
  { id: 5, title: '成效檢查表', icon: ListChecks },
  { id: 6, title: '30 天優化清單', icon: Rocket }
];

const HOME_PROOFS = [
  'AI 有沒有提到你',
  '有沒有被正確描述',
  '競品是否出現但你沒出現'
];

function HomeIntro() {
  return (
    <section className="home-hero-compact">
      <p className="home-credit">
        由台灣 SEO 專家{' '}
        <a href="https://www.facebook.com/backtrue" target="_blank" rel="noreferrer">邱煜庭（小黑老師）</a>
        {' '}規劃設計
      </p>
      <h1 className="home-title-compact">檢查你的品牌，在 AI 回答裡有沒有被看見</h1>
      <p className="home-subtitle-compact">
        輸入網站，系統會用你提供的 OpenAI 或 Gemini API Key 模擬 AI 搜尋回答；兩組都填時會比較 ChatGPT 與 Gemini 覆蓋率。
      </p>
      <p className="home-method-note">
        本工具依據「
        <a href="http://aeogeo.thinkwithblack.com/" target="_blank" rel="noreferrer">內容結構學</a>
        」的 AEO/GEO 診斷思路設計。
      </p>
      <div className="home-proof-grid">
        {HOME_PROOFS.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

export default function AeoDashboard() {
  const {
    url,
    setUrl,
    loading,
    error,
    result,
    activeStep,
    setActiveStep,
    completedSteps,
    apiKeys,
    setApiKeys,
    keysReady,
    saveApiKeys,
    runAnalysis,
    isStepCurrent,
    handleInitialAnalyze
  } = usePipeline();

  const [showSetup, setShowSetup] = useState(!keysReady);
  const [legalType, setLegalType] = useState(null);
  const staleAutoRunRef = useRef('');

  const handleSaveKeys = (event) => {
    event.preventDefault();
    if (saveApiKeys()) setShowSetup(false);
  };

  const handleNextStep = async () => {
    if (!result || activeStep >= 6) return;
    const next = activeStep + 1;
    setActiveStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!isStepCurrent(next)) {
      await runAnalysis(next);
    }
  };

  useEffect(() => {
    if (!result || loading || activeStep <= 1) return;
    if (isStepCurrent(activeStep)) {
      staleAutoRunRef.current = '';
      return;
    }
    const staleKey = `${result.runId || 'local'}:${activeStep}:${result.stepRecords?.[String(activeStep)]?.recordId || 'missing'}`;
    if (result[`step${activeStep}`] && staleAutoRunRef.current !== staleKey) {
      staleAutoRunRef.current = staleKey;
      runAnalysis(activeStep);
    }
  }, [activeStep, result, loading, isStepCurrent, runAnalysis]);

  return (
    <div className="app-container">
      <div className="bg-mesh"></div>
      <main className="container">
        {result && (
          <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="outfit" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '1rem', fontWeight: 600 }}>
              <Cpu size={24} /> AEO / GEO 成效診斷顧問
            </div>
            <h1 className="section-title">Aeogeo Check</h1>
            <p className="subtitle">輸入網站 URL，系統會依規格書執行 6 步診斷管線。</p>
          </header>
        )}

        <AnimatePresence mode="wait">
          {showSetup ? (
            <motion.div
              key="key-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={!result ? 'home-shell' : ''}
            >
              {!result && <HomeIntro />}
              <form
                onSubmit={handleSaveKeys}
                className="glass-card home-form-compact"
                style={{ maxWidth: '720px', margin: '0 auto' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h2 className="outfit" style={{ margin: 0 }}>先填入至少一組 API Key</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>只填一組會用單模型完成分析；OpenAI 與 Gemini 都填會啟用雙模型比較。</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <label>OpenAI API Key</label>
                  <input
                    type="password"
                    value={apiKeys.openai}
                    onChange={(event) => setApiKeys({ ...apiKeys, openai: event.target.value })}
                    className="glass-input"
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                  <label>Gemini API Key</label>
                  <input
                    type="password"
                    value={apiKeys.gemini}
                    onChange={(event) => setApiKeys({ ...apiKeys, gemini: event.target.value })}
                    className="glass-input"
                    placeholder="AIza..."
                    autoComplete="off"
                  />
                  <button type="submit" className="btn-primary">儲存並繼續</button>
                </div>
                <p className="home-flow-hint">會自動產生 30 題測試題、挑出最重要 10 題，並產出優先修正問題。</p>
                <p className="legal-consent-note">
                  繼續即同意
                  <button type="button" onClick={() => setLegalType('terms')}>使用者條款</button>
                  與
                  <button type="button" onClick={() => setLegalType('privacy')}>隱私權政策</button>
                  ，分析產出可用於服務優化、題庫建置與產品分析。
                </p>
                {error && <p className="error-text">{error}</p>}
              </form>
            </motion.div>
          ) : !result ? (
            <motion.div
              key="url-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="home-shell"
            >
              <HomeIntro />
              <form
                onSubmit={handleInitialAnalyze}
                className="glass-card home-form-compact"
                style={{ maxWidth: '720px', margin: '0 auto' }}
              >
                <div className="home-url-form-row">
                  <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} className="glass-input" placeholder="https://your-brand.com" required />
                  <button type="submit" className="btn-primary" disabled={loading}>{loading ? '分析中...' : '開始檢查 AI 能見度'}</button>
                </div>
                <p className="home-flow-hint">會自動產生 30 題測試題、挑出最重要 10 題，並產出優先修正問題。</p>
                {error && <p className="error-text">{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>使用已儲存在此瀏覽器 localStorage 的 BYOK API Key。</p>
                  <button type="button" className="step-item" onClick={() => setShowSetup(true)}>更換 API Key</button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div key="report-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="report-view">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button type="button" className="step-item" onClick={() => setShowSetup(true)}>更換 API Key</button>
              </div>
              <div className="steps-nav">
                {STEPS.map((step) => (
                  <button
                    type="button"
                    key={step.id}
                    className={`step-item ${activeStep === step.id ? 'active' : ''} ${completedSteps.includes(step.id) ? 'completed' : ''}`}
                    onClick={async () => {
                      if (step.id === 1 || completedSteps.includes(step.id)) {
                        setActiveStep(step.id);
                        return;
                      }
                      if (result[`step${step.id}`] && !isStepCurrent(step.id)) {
                        setActiveStep(step.id);
                        await runAnalysis(step.id);
                      }
                    }}
                  >
                    <step.icon size={16} style={{ marginRight: '8px' }} /> {step.title}
                  </button>
                ))}
              </div>
              <div className="glass-card" style={{ minHeight: '400px' }}>
                {activeStep === 1 && <Step1 data={result.step1} onRefresh={runAnalysis} loading={loading} />}
                {activeStep === 2 && <Step2 data={result.step2} onRefresh={runAnalysis} loading={loading} />}
                {activeStep === 3 && <Step3 data={isStepCurrent(3) ? result.step3 : null} onRefresh={runAnalysis} loading={loading} />}
                {activeStep === 4 && <Step4 data={isStepCurrent(4) ? result.step4 : null} loading={loading} />}
                {activeStep === 5 && <Step5 data={isStepCurrent(5) ? result.step5 : null} onRefresh={runAnalysis} loading={loading} />}
                {activeStep === 6 && <Step6 data={isStepCurrent(6) ? result.step6 : null} loading={loading} />}
                {error && <p className="error-text">{error}</p>}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                  <button type="button" className="step-item" onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)} disabled={activeStep === 1}>上一步</button>
                  {activeStep < 6 && (
                    <button type="button" className="btn-primary" onClick={handleNextStep} disabled={loading}>{activeStep === 5 ? '查看優化建議' : '下一步'} <ChevronRight size={18} /></button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="legal-footer">
        <button type="button" onClick={() => setLegalType('terms')}>使用者條款</button>
        <span>/</span>
        <button type="button" onClick={() => setLegalType('privacy')}>隱私權政策</button>
      </footer>
      <LegalModal type={legalType} onClose={() => setLegalType(null)} />
      <style dangerouslySetInnerHTML={{ __html: `.spinner { width: 50px; height: 50px; border: 3px solid rgba(214, 168, 79, 0.12); border-radius: 50%; border-top-color: var(--accent-primary); animation: spin 1s linear infinite; margin: 0 auto; } @keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
