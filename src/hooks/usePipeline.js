
import { useState, useEffect } from 'react';
import { diagnosticPipeline } from '../services/pipeline';
import { normalizeUrl, loadFromDB } from '../utils/helpers';

export function usePipeline() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem('aeo_keys');
    return saved ? JSON.parse(saved) : { openai: '', gemini: '' };
  });

  // 自動存儲 API Key
  useEffect(() => {
    if (apiKeys.openai && apiKeys.gemini) {
      localStorage.setItem('aeo_keys', JSON.stringify(apiKeys));
    }
  }, [apiKeys]);

  const runAnalysis = async (stepNumber, targetUrl = url) => {
    // 這裡解決了重新分析的問題：從當前結果中恢復 URL
    const finalUrl = targetUrl || result?.url;
    if (!finalUrl) return alert('請輸入網址');

    setLoading(true);
    try {
      const updatedResult = await diagnosticPipeline.run(stepNumber, {
        url: finalUrl,
        apiKeys,
        result: result || {}
      });
      setResult(updatedResult);
      if (updatedResult.url) setUrl(updatedResult.url);
      setCompletedSteps(prev => [...new Set([...prev, stepNumber])]);
    } catch (e) {
      alert(`分析失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialAnalyze = async (e) => {
    e.preventDefault();
    if (!url) return;
    const targetUrl = normalizeUrl(url);
    const cached = loadFromDB(targetUrl);
    if (cached) {
      setResult(cached);
      if (cached.url || targetUrl) setUrl(cached.url || targetUrl); // 同步網址狀態
      setCompletedSteps([1, 2, 3, 4, 5, 6].filter(s => cached[`step${s}`]));
      return;
    }
    await runAnalysis(1, targetUrl);
  };

  return {
    url, setUrl,
    loading,
    result,
    activeStep, setActiveStep,
    completedSteps,
    apiKeys, setApiKeys,
    runAnalysis,
    handleInitialAnalyze
  };
}
