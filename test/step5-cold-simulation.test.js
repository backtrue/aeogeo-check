import assert from 'node:assert/strict';
import test from 'node:test';
import { __testables } from '../functions/api/analyze.js';

const {
  extractBrandCandidates,
  getChecklistJudgePrompt,
  getColdSimulationPrompt,
  getQuestionForColdSimulation,
  normalizeChecklistRow
} = __testables;

const step1 = {
  brandIdentity: '黑璞數位',
  sourceUrl: 'https://www.blackgem.com.tw',
  differentiation: '專注 AEO/GEO 顧問服務',
  evidence: ['黑璞數位提供 AI 搜尋顧問服務']
};

const step4 = [
  {
    scenario: '回答沒有提到品牌',
    surface: '沒有提品牌',
    rootCause: '品牌語境不足',
    optimizationTarget: '105 品牌語境',
    nextAction: '補強品牌實體訊號'
  }
];

const topQuestion = {
  priority: 1,
  question: '台灣有哪些 AI 搜尋優化顧問可以協助 B2B 網站？',
  type: '推薦',
  reason: '商業價值高',
  focus: '觀察是否提到黑璞數位'
};

test('冷啟動 prompt 只包含題目與類型，不帶前序品牌資料或 Step4 規則', () => {
  const prompt = getColdSimulationPrompt(topQuestion, 'ChatGPT');

  assert.match(prompt, /台灣有哪些 AI 搜尋優化顧問/);
  assert.match(prompt, /推薦/);
  assert.doesNotMatch(prompt, /黑璞數位/);
  assert.doesNotMatch(prompt, /blackgem/);
  assert.doesNotMatch(prompt, /Step 1/);
  assert.doesNotMatch(prompt, /Step 4/);
  assert.doesNotMatch(prompt, /判讀規則/);
  assert.doesNotMatch(prompt, /商業價值高/);
  assert.doesNotMatch(prompt, /觀察是否提到/);
});

test('冷啟動題目物件會移除 Step3 reason 與 focus', () => {
  assert.deepEqual(getQuestionForColdSimulation(topQuestion), {
    question: '台灣有哪些 AI 搜尋優化顧問可以協助 B2B 網站？',
    type: '推薦'
  });
});

test('判讀 prompt 使用固定 simulatedAnswer，且不要求重新模擬回答', () => {
  const simulatedAnswer = '可以考慮 iKala、awoo、Welly SEO 等服務商。';
  const prompt = getChecklistJudgePrompt(step1, step4, topQuestion, 'ChatGPT', simulatedAnswer);

  assert.match(prompt, new RegExp(simulatedAnswer));
  assert.match(prompt, /不得改寫、補寫、擴寫或重新產生冷啟動回答/);
  assert.match(prompt, /aiCitesContent 必須填 false/);
  assert.doesNotMatch(prompt, /先模擬/);
});

test('沒有官方 citation metadata 時，aiCitesContent 一律為 false', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '黑璞數位是一家 AI 搜尋優化顧問。',
      aiCitesContent: true,
      aiMentionsBrand: true,
      aiDescribesBrandCorrectly: true,
      competitorsMentioned: [],
      score: 95
    },
    topQuestion,
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false
    }
  );

  assert.equal(row.aiCitesContent, false);
});

test('simulatedAnswer 未出現品牌時，不得判定為提到品牌', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '可以考慮 iKala、awoo、Welly SEO 等服務商。',
      aiMentionsBrand: true,
      aiDescribesBrandCorrectly: true,
      competitorsMentioned: ['iKala', 'awoo', '不存在品牌'],
      score: 88
    },
    topQuestion,
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false
    }
  );

  assert.equal(row.aiMentionsBrand, false);
  assert.equal(row.aiDescribesBrandCorrectly, false);
  assert.deepEqual(row.competitorsMentioned, ['iKala', 'awoo']);
});

test('競品出現但本品牌未出現時，標記競品壓過且分數小於 60', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '可以考慮 iKala、awoo、Welly SEO 等服務商。',
      aiMentionsBrand: false,
      competitorsMentioned: ['iKala', 'awoo', 'Welly SEO'],
      score: 90
    },
    topQuestion,
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false
    }
  );

  assert.equal(row.competitorDominanceRisk, true);
  assert.equal(row.score, 59);
});
