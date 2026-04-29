
import React, { useState } from 'react';
import { Search, BarChart3, ListChecks, Calendar, Rocket, Globe, Cpu, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Unified Steps
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';

// Hooks
import { usePipeline } from './hooks/usePipeline';

const STEPS = [
  { id: 1, title: '品牌與主題', icon: Globe },
  { id: 2, title: 'AI 搜尋測試題庫', icon: Search },
  { id: 3, title: '核心 10 題', icon: BarChart3 },
  { id: 4, title: '判讀規則', icon: Cpu },
  { id: 5, title: '成效檢查表', icon: ListChecks },
  { id: 6, title: '30 天優化清單', icon: Rocket },
];

export default function AeoDashboard() {
  const {
    url, setUrl,
    loading,
    result,
    activeStep, setActiveStep,
    completedSteps,
    apiKeys, setApiKeys,
    runAnalysis,
    handleInitialAnalyze
  } = usePipeline();

  const [showSetup, setShowSetup] = useState(!apiKeys.openai || !apiKeys.gemini);

  const handleNextStep = async () => {
    if (activeStep < 6) {
      const next = activeStep + 1;
      if (!result[`step${next}`]) await runAnalysis(next);
      setActiveStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="app-container">
      <div className="bg-mesh"></div>
      <main className="container">
        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div className="outfit" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '1rem', fontWeight: 600 }}>
            <Cpu size={24} /> AEO / GEO 成效診斷顧問
          </div>
          <h1 className="section-title">Aeogeo Check</h1>
        </header>

        <AnimatePresence mode="wait">
          {showSetup || !result ? (
            <motion.form 
              key="setup-form"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              onSubmit={showSetup ? (e) => { e.preventDefault(); setShowSetup(false); } : handleInitialAnalyze} 
              className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}
            >
              {showSetup ? (
                <div style={{ display: 'grid', gap: '1rem', textAlign: 'left' }}>
                  <label>OpenAI API Key</label>
                  <input type="password" value={apiKeys.openai} onChange={e => setApiKeys({...apiKeys, openai: e.target.value})} className="glass-input" placeholder="sk-..." />
                  <label>Gemini API Key</label>
                  <input type="password" value={apiKeys.gemini} onChange={e => setApiKeys({...apiKeys, gemini: e.target.value})} className="glass-input" placeholder="AIza..." />
                  <button onClick={() => setShowSetup(false)} className="btn-primary">儲存並繼續</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="glass-input" placeholder="https://example.com" required />
                  <button type="submit" className="btn-primary" disabled={loading}>{loading ? '分析中...' : '開始診斷'}</button>
                </div>
              )}
            </motion.form>
          ) : (
            <motion.div key="report-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="report-view">
              <div className="steps-nav">
                {STEPS.map(step => (
                  <div key={step.id} className={`step-item ${activeStep === step.id ? 'active' : ''} ${completedSteps.includes(step.id) ? 'completed' : ''}`} onClick={() => (completedSteps.includes(step.id) || step.id === 1) && setActiveStep(step.id)}>
                    <step.icon size={16} style={{ marginRight: '8px' }} /> {step.title}
                  </div>
                ))}
              </div>
              <div className="glass-card" style={{ minHeight: '400px' }}>
                {activeStep === 1 && <Step1 data={result.step1} onRefresh={runAnalysis} loading={loading} />}
                {activeStep === 2 && <Step2 data={result.step2} onRefresh={runAnalysis} loading={loading} />}
                {activeStep === 3 && <Step3 data={result.step3} loading={loading} />}
                {activeStep === 4 && <Step4 data={result.step4} loading={loading} />}
                {activeStep === 5 && <Step5 data={result.step5} loading={loading} />}
                {activeStep === 6 && <Step6 data={result.step6} findings={result.step5} loading={loading} />}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                  <button className="step-item" onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)} disabled={activeStep === 1}>上一步</button>
                  <button className="btn-primary" onClick={handleNextStep} disabled={activeStep === 6}>{activeStep === 5 ? '查看優化建議' : '下一步'} <ChevronRight size={18} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `.spinner { width: 50px; height: 50px; border: 3px solid rgba(129, 140, 248, 0.1); border-radius: 50%; border-top-color: var(--accent-primary); animation: spin 1s linear infinite; margin: 0 auto; } @keyframes spin { to { transform: rotate(360deg); } }`}} />
    </div>
  );
}
