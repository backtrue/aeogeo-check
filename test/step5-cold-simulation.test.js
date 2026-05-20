import assert from 'node:assert/strict';
import test from 'node:test';
import { __testables } from '../functions/api/analyze.js';

const {
  extractBrandCandidates,
  getChecklistJudgePrompt,
  getColdSimulationPrompt,
  getQuestionForColdSimulation,
  getUserFacingDiagnosisPrompt,
  normalizeUrl,
  normalizeStep4Rules,
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
    scenario: 'AI 提到競品，但沒有提到本品牌',
    surface: '競品被推薦，本品牌缺席',
    rootCause: '主題關聯不足',
    optimizationTarget: '105 品牌語境',
    nextAction: '補第三方提及與推薦清單'
  },
  {
    scenario: 'AI 提到品牌，但描述錯誤',
    surface: '品牌被錯誤描述',
    rootCause: '外部語境混亂',
    optimizationTarget: '105 品牌語境',
    nextAction: '統一外部證詞與品牌描述'
  },
  {
    scenario: 'AI 只在低意圖問題中出現',
    surface: '高意圖題缺席',
    rootCause: '商業決策內容不足',
    optimizationTarget: '商業決策頁',
    nextAction: '補比較頁、案例頁、方案頁與諮詢入口'
  }
];

const topQuestion = {
  priority: 1,
  question: '台灣有哪些 AI 搜尋優化顧問可以協助 B2B 網站？',
  type: '推薦',
  reason: '商業價值高',
  focus: '觀察是否提到黑璞數位'
};

test('網址正規化支援裸 domain 並補 https', () => {
  assert.equal(normalizeUrl('yttsd.com'), 'https://yttsd.com');
  assert.equal(normalizeUrl('www.yttsd.com'), 'https://www.yttsd.com');
});

test('網址正規化會清除首頁 index 檔名與 hash', () => {
  assert.equal(normalizeUrl('yttsd.com/index.html'), 'https://yttsd.com');
  assert.equal(normalizeUrl('https://yttsd.com/index.php#top'), 'https://yttsd.com');
  assert.equal(normalizeUrl('https://yttsd.com/blog/index.html?utm_source=test'), 'https://yttsd.com/blog?utm_source=test');
});

test('冷啟動 prompt 只包含題目，不帶前序品牌資料、Step3 類型或 Step4 規則', () => {
  const prompt = getColdSimulationPrompt(topQuestion, 'ChatGPT');

  assert.match(prompt, /台灣有哪些 AI 搜尋優化顧問/);
  assert.doesNotMatch(prompt, /推薦/);
  assert.doesNotMatch(prompt, /測試平台/);
  assert.doesNotMatch(prompt, /問題類型/);
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
    question: '台灣有哪些 AI 搜尋優化顧問可以協助 B2B 網站？'
  });
});

test('判讀 prompt 使用固定 simulatedAnswer，且不要求重新模擬回答', () => {
  const simulatedAnswer = '可以考慮 iKala、awoo、Welly SEO 等服務商。';
  const prompt = getChecklistJudgePrompt(step1, step4, topQuestion, 'ChatGPT', simulatedAnswer);

  assert.match(prompt, new RegExp(simulatedAnswer));
  assert.match(prompt, /不得改寫、補寫、擴寫或重新產生冷啟動回答/);
  assert.match(prompt, /aiCitesContent 必須填 false/);
  assert.match(prompt, /SEO106 判讀規則/);
  assert.match(prompt, /四無且沒有鄰近品牌/);
  assert.doesNotMatch(prompt, /先模擬/);
});

test('Step 4 情境正規化為 SEO106 九種', () => {
  const rules = normalizeStep4Rules(step4);

  assert.equal(rules.length, 9);
  assert.deepEqual(rules.map((rule) => rule.scenario), [
    'AI 完全沒有引用品牌或內容',
    'AI 使用了觀點，但沒有標示來源',
    'AI 引用了內容，但沒有提到品牌',
    'AI 提到品牌，但描述很籠統',
    'AI 提到品牌，但描述錯誤',
    'AI 提到競品，但沒有提到本品牌',
    'AI 把品牌跟錯誤競品放在一起',
    'AI 只在品牌名問題中出現',
    'AI 只在低意圖問題中出現'
  ]);
});

test('沒有官方 citation metadata 時，aiCitesContent 一律為 false', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '黑璞數位是一家 AI 搜尋優化顧問。',
      aiCitesContent: true,
      aiMentionsBrand: true,
      aiDescribesBrandCorrectly: true,
      mentionStatus: '有',
      descriptionStatus: '正確',
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
      hasCitationMetadata: false,
      step4
    }
  );

  assert.equal(row.aiCitesContent, false);
  assert.equal(row.citationStatus, '沒有');
  assert.equal(row.simulationMode, 'cold-start-v2');
});

test('simulatedAnswer 未出現品牌時，不得判定為提到品牌', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '可以考慮 iKala、awoo、Welly SEO 等服務商。',
      aiMentionsBrand: true,
      aiDescribesBrandCorrectly: true,
      nearbyBrands: ['iKala', 'awoo', '不存在品牌'],
      score: 88
    },
    topQuestion,
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false,
      step4
    }
  );

  assert.equal(row.aiMentionsBrand, false);
  assert.equal(row.aiDescribesBrandCorrectly, false);
  assert.deepEqual(row.nearbyBrands, ['iKala', 'awoo']);
});

test('競品出現但本品牌未出現時，標記嚴重缺口且分數小於 60', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '可以考慮 iKala、awoo、Welly SEO 等服務商。',
      aiMentionsBrand: false,
      nearbyBrands: ['iKala', 'awoo', 'Welly SEO'],
      score: 90
    },
    topQuestion,
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false,
      step4
    }
  );

  assert.equal(row.competitorDominanceRisk, true);
  assert.equal(row.severity, 'critical');
  assert.equal(row.answerPhenomenon, 'AI 提到競品，但沒有提到本品牌');
  assert.equal(row.score, 59);
});

test('四無非商業題不列為嚴重缺口', () => {
  const definitionQuestion = {
    priority: 2,
    question: '什麼是 AI 搜尋優化？',
    type: '定義'
  };
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: 'AI 搜尋優化是讓內容更容易被回答型系統理解與整理的方法。',
      aiMentionsBrand: false,
      nearbyBrands: [],
      score: 30
    },
    definitionQuestion,
    1,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false,
      step4
    }
  );

  assert.equal(row.severity, 'observe');
  assert.equal(row.answerPhenomenon, 'AI 完全沒有引用品牌或內容');
  assert.equal(row.score, 80);
});

test('引用但未提品牌會匹配 Entity 連結弱', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '這套框架強調先建立問題題庫，再檢查 AI 是否引用內容。',
      citationStatus: '有',
      mentionStatus: '沒有',
      descriptionStatus: '未提及',
      aiMentionsBrand: false,
      nearbyBrands: [],
      score: 85
    },
    topQuestion,
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: true,
      step4
    }
  );

  assert.equal(row.severity, 'warning');
  assert.equal(row.answerPhenomenon, 'AI 引用了內容，但沒有提到品牌');
  assert.equal(row.matchedStep4Rule.optimizationTarget, '105 品牌語境');
});

test('品牌描述錯誤會匹配 105 品牌語境並列 critical', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '黑璞數位是一套自動化 SEO 工具。',
      aiMentionsBrand: true,
      mentionStatus: '有',
      descriptionStatus: '錯誤',
      aiDescribesBrandCorrectly: false,
      nearbyBrands: [],
      score: 88
    },
    topQuestion,
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false,
      step4
    }
  );

  assert.equal(row.severity, 'critical');
  assert.equal(row.answerPhenomenon, 'AI 提到品牌，但描述錯誤');
  assert.equal(row.matchedStep4Rule.optimizationTarget, '105 品牌語境');
  assert.equal(row.score, 59);
});

test('決策題缺席會匹配補商業決策頁', () => {
  const decisionQuestion = {
    priority: 3,
    question: '品牌想被 AI 引用，第一步應該找誰協助？',
    type: '決策'
  };
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '建議先找熟悉 SEO、內容策略與技術架構的顧問團隊。',
      aiMentionsBrand: false,
      nearbyBrands: [],
      score: 92
    },
    decisionQuestion,
    2,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false,
      step4
    }
  );

  assert.equal(row.severity, 'critical');
  assert.equal(row.answerPhenomenon, 'AI 只在低意圖問題中出現');
  assert.equal(row.matchedStep4Rule.optimizationTarget, '商業決策頁');
  assert.equal(row.score, 59);
});

test('使用者診斷 prompt 要求 gpt 寫具體前台文案且禁止內部術語', () => {
  const row = normalizeChecklistRow(
    {
      simulatedAnswer: '挑選 AEO 顧問時，建議看內容策略、技術架構、案例與顧問經驗。',
      aiMentionsBrand: false,
      nearbyBrands: [],
      score: 92
    },
    {
      priority: 1,
      question: 'AEO 顧問怎麼選？',
      type: '決策'
    },
    0,
    'openai',
    'ChatGPT',
    '',
    {
      brandCandidates: extractBrandCandidates(step1),
      hasCitationMetadata: false,
      step4
    }
  );
  const prompt = getUserFacingDiagnosisPrompt(step1, row);

  assert.match(prompt, /必須根據 question 與 simulatedAnswer 寫，不得寫通案/);
  assert.match(prompt, /不得出現「SEO106」「低意圖」「高意圖」「Entity」「answerPhenomenon」/);
  assert.match(prompt, /userFacingProblem/);
  assert.match(prompt, /userFacingGap/);
  assert.match(prompt, /userFacingNextStep/);
});
