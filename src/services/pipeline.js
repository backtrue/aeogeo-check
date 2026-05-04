import { saveToDB, normalizeUrl } from '../utils/helpers';

const STEP_DEPENDENCIES = {
  3: [2],
  4: [2, 3],
  5: [2, 3, 4],
  6: [5]
};

const STEP5_SIMULATION_MODE = 'cold-start-v2';

function getStepRecord(result, stepNumber) {
  return result?.stepRecords?.[String(stepNumber)] || result?.stepRecords?.[stepNumber] || null;
}

function normalizeProviderName(value) {
  const name = String(value || '').toLowerCase();
  if (name.includes('gemini')) return 'gemini';
  if (name.includes('chatgpt') || name.includes('openai')) return 'openai';
  return name;
}

function hasCompleteStep5Data(result) {
  const rows = Array.isArray(result?.step5) ? result.step5 : [];
  if (!rows.length) return false;
  if (rows.some((row) => row?.simulationMode !== STEP5_SIMULATION_MODE)) return false;
  if (result.providerMode === 'openai-only') {
    return rows.some((row) => normalizeProviderName(row.platform || row.provider) === 'openai');
  }
  if (result.providerMode === 'gemini-only') {
    return rows.some((row) => normalizeProviderName(row.platform || row.provider) === 'gemini');
  }
  const providers = new Set(rows.map((row) => normalizeProviderName(row.platform || row.provider)).filter(Boolean));
  return providers.has('openai') && providers.has('gemini');
}

export function isStepCurrent(result, stepNumber) {
  if (!result?.[`step${stepNumber}`]) return false;
  if (stepNumber === 5 && !hasCompleteStep5Data(result)) return false;
  const dependencies = STEP_DEPENDENCIES[stepNumber] || [];
  if (!dependencies.length) return true;
  const currentDependencyRecords = dependencies.map((dependencyStep) => getStepRecord(result, dependencyStep));
  if (currentDependencyRecords.some((record) => !record?.recordId)) return true;

  const stepRecord = getStepRecord(result, stepNumber);
  if (!stepRecord?.recordId || !stepRecord.dependencies) return false;

  return dependencies.every((dependencyStep, index) => {
    const currentDependency = currentDependencyRecords[index];
    const recordedDependency = stepRecord.dependencies[String(dependencyStep)] || stepRecord.dependencies[dependencyStep];
    return Boolean(currentDependency?.recordId && recordedDependency?.recordId && currentDependency.recordId === recordedDependency.recordId);
  });
}

export function getCurrentCompletedSteps(result) {
  return [1, 2, 3, 4, 5, 6].filter((stepNumber) => isStepCurrent(result, stepNumber));
}

export const diagnosticPipeline = {
  async run(stepNumber, context) {
    const { url, result, apiKeys } = context;
    const normalized = normalizeUrl(url);
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: normalized,
        step: stepNumber,
        previousResults: result || {},
        runId: result?.runId,
        keys: apiKeys || {}
      })
    });

    const rawText = await response.text();
    const payload = (() => {
      try {
        return rawText ? JSON.parse(rawText) : null;
      } catch (error) {
        const preview = rawText.slice(0, 160) || '空白回應';
        throw new Error(`分析 API 回傳非 JSON（HTTP ${response.status}）：${preview}`, { cause: error });
      }
    })();

    if (!response.ok || payload?.error) {
      throw new Error(payload?.error || `分析 API 失敗: ${response.status}`);
    }

    const stepRecords = {
      ...(result?.stepRecords || {}),
      [String(stepNumber)]: {
        step: stepNumber,
        recordId: payload.storage?.recordId || null,
        persistedAt: payload.storage?.persistedAt || null,
        providerMode: payload.providerMode || payload.storage?.providerMode || result?.providerMode || 'dual',
        stepKey: payload.storage?.stepKey || null,
        latestStepKey: payload.storage?.latestStepKey || null,
        dependencies: payload.storage?.dependencies || {}
      }
    };
    const updatedResult = {
      ...(result || {}),
      url: payload.url || normalized,
      runId: payload.runId || result?.runId,
      providerMode: payload.providerMode || payload.storage?.providerMode || result?.providerMode || 'dual',
      storage: payload.storage || result?.storage,
      stepRecords,
      [`step${stepNumber}`]: payload.data
    };
    saveToDB(updatedResult.url, updatedResult);
    return updatedResult;
  }
};
