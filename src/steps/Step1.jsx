
import React from 'react';
import { Globe, BarChart3, ListChecks, Info, Rocket, Calendar } from 'lucide-react';
import InfoCard from '../components/InfoCard';
import { callOpenAIDirect, callGeminiDirect } from '../services/ai';
import { fetchSiteContent } from '../utils/helpers';

/**
 * ============================================================
 * STEP 1: 實體事實提取 (Entity Fact Extraction)
 * ============================================================
 * 遵循「去標籤化」原則：禁止出現 AEO、品牌、行銷術語。
 * 專注於提取該對象在搜尋引擎眼中的「硬核事實」。
 */

const FACT_SCHEMA = {
  whoIsIt: "它是誰？（正式稱呼、背景、核心組成，禁止形容詞）",
  whatItDoes: "它具體提供什麼？（產品規格、服務參數、核心內容）",
  searchThemes: "它最常出現在哪些搜尋主題中？",
  userPersonas: "誰在搜尋它？他們當下的搜尋意圖是什麼？",
  hardcoreFacts: "事實證據（專利、數據、獲獎紀錄、具體代言/合作對象）"
};

export default function Step1({ data, onRefresh, loading }) {
  if (!data && !loading) return null;

  if (loading) {
    return (
      <div className="flex-center" style={{ padding: '4rem', minHeight: '400px' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          搜尋行為研究員正在提取底層數據事實...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 1｜事實提取與主題定位</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            來源網址：{data?.sourceUrl}
          </p>
        </div>
        <button 
          onClick={() => {
            const url = data?.sourceUrl || window.location.href;
            if (confirm(`確定要針對此來源重新提取事實嗎？`)) onRefresh(1, url);
          }} 
          className="step-item" 
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <Calendar size={14} style={{ marginRight: '6px' }} /> 重新分析事實
        </button>
      </div>

      <div className="grid-30">
        <InfoCard title="1. 實體定義" content={data?.whoIsIt} icon={<Globe size={20} />} />
        <InfoCard title="2. 核心內容與規格" content={data?.whatItDoes} icon={<BarChart3 size={20} />} />
        <InfoCard title="3. 搜尋意圖主題" content={data?.searchThemes} icon={<ListChecks size={20} />} />
        <InfoCard title="4. 使用者意圖分析" content={data?.userPersonas} icon={<Info size={20} />} />
        <InfoCard title="5. 硬核證據數據" content={data?.hardcoreFacts} icon={<Rocket size={20} />} />
      </div>
    </div>
  );
}

export async function executeStep1(url, apiKeys) {
  const site = await fetchSiteContent(url);
  const content = site?.bodyText?.substring(0, 6000) || "";
  if (!content) throw new Error("無法取得網頁內容。");

  // 1. 提取指令
  const extractionPrompt = `
    你是一位「搜尋行為研究員」。請分析以下內容，並提取其中的「硬核事實」。
    
    【嚴格禁令】:
    禁止使用「品牌、行銷、AEO、USP、優勢、價值、領先、卓越」等商業包裝或形容詞。
    
    【提取任務】:
    1. 它到底是誰？（背景、稱呼）
    2. 它提供什麼具體的規格或數據？
    3. 有哪些事實證據（專利、合作名稱、數據參數）？
    
    【網頁內容】:
    ${content}
    
    【輸出 JSON 格式規定】:
    ${JSON.stringify(FACT_SCHEMA, null, 2)}
  `;

  const [resA, resB] = await Promise.all([
    callOpenAIDirect(apiKeys.openai, 'gpt-4o-mini', extractionPrompt).catch(e => ({ error: e.message })),
    callGeminiDirect(apiKeys.gemini, 'gemini-2.5-flash', extractionPrompt).catch(e => ({ error: e.message }))
  ]);

  // 2. 合成指令
  const synthesisPrompt = `
    你是一位「資深搜尋意圖研究員」。請綜合以下兩份事實報告。
    
    【報告 A】: ${JSON.stringify(resA)}
    【報告 B】: ${JSON.stringify(resB)}
    
    【合成要求】:
    1. 必須剔除所有主觀包裝詞彙。
    2. 強化具體事實證據（如：專利、具體代言人名稱、技術數據）。
    3. 最終結果必須為標準 JSON，且欄位名稱必須完全對應：whoIsIt, whatItDoes, searchThemes, userPersonas, hardcoreFacts。
    
    【輸出 JSON 規範】:
    ${JSON.stringify(FACT_SCHEMA, null, 2)}
  `;

  const finalResult = await callOpenAIDirect(apiKeys.openai, 'gpt-4o', synthesisPrompt);
  
  return {
    ...finalResult,
    sourceUrl: url
  };
}
