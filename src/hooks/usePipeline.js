import { useEffect, useState } from 'react';
import { diagnosticPipeline, getCurrentCompletedSteps, isStepCurrent } from '../services/pipeline';
import { normalizeUrl, loadFromDB } from '../utils/helpers';

const API_KEYS_STORAGE_KEY = 'aeo_keys';

function readSavedKeys() {
  try {
    const saved = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!saved) return { openai: '', gemini: '' };
    const parsed = JSON.parse(saved);
    return {
      openai: typeof parsed.openai === 'string' ? parsed.openai : '',
      gemini: typeof parsed.gemini === 'string' ? parsed.gemini : ''
    };
  } catch (error) {
    console.error('Load API keys failed:', error);
    return { openai: '', gemini: '' };
  }
}

function hasRequiredKeys(keys) {
  return Boolean(keys.openai?.trim() || keys.gemini?.trim());
}

export function usePipeline() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [apiKeys, setApiKeys] = useState(readSavedKeys);
  const keysReady = hasRequiredKeys(apiKeys);

  useEffect(() => {
    if (!keysReady) return;
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify({
      openai: apiKeys.openai.trim(),
      gemini: apiKeys.gemini.trim()
    }));
  }, [apiKeys, keysReady]);

  const saveApiKeys = () => {
    if (!hasRequiredKeys(apiKeys)) {
      setError('請至少填入一組 OpenAI 或 Gemini API Key。');
      return false;
    }
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify({
      openai: apiKeys.openai.trim(),
      gemini: apiKeys.gemini.trim()
    }));
    setError('');
    return true;
  };

  const runAnalysis = async (stepNumber, targetUrl = url) => {
    const finalUrl = targetUrl || result?.url;
    if (!keysReady) {
      setError('請先填入至少一組 OpenAI 或 Gemini API Key。');
      return null;
    }
    if (!finalUrl) {
      setError('請輸入網址。');
      return null;
    }

    setError('');
    setLoading(true);
    try {
      const updatedResult = await diagnosticPipeline.run(stepNumber, {
        url: finalUrl,
        result: result || {},
        apiKeys: {
          openai: apiKeys.openai.trim(),
          gemini: apiKeys.gemini.trim()
        }
      });
      setResult(updatedResult);
      if (updatedResult.url) setUrl(updatedResult.url);
      setCompletedSteps(getCurrentCompletedSteps(updatedResult));
      return updatedResult;
    } catch (caughtError) {
      console.error('Pipeline failed:', caughtError);
      setError(caughtError.message || '分析失敗。');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleInitialAnalyze = async (event) => {
    event.preventDefault();
    if (!keysReady) {
      setError('請先填入至少一組 OpenAI 或 Gemini API Key。');
      return;
    }
    if (!url) {
      setError('請輸入網址。');
      return;
    }

    const targetUrl = normalizeUrl(url);
    const cached = loadFromDB(targetUrl);
    if (cached) {
      setError('');
      setResult(cached);
      setUrl(cached.url || targetUrl);
      setCompletedSteps(getCurrentCompletedSteps(cached));
      return;
    }

    await runAnalysis(1, targetUrl);
  };

  return {
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
    isStepCurrent: (stepNumber) => isStepCurrent(result, stepNumber),
    handleInitialAnalyze
  };
}
