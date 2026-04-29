
export const normalizeUrl = (u) => {
  try {
    const trimmed = u.trim().toLowerCase();
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  } catch (e) {
    return u;
  }
};

export async function fetchSiteContent(url) {
  let usedLevel2 = false;
  const proxies = [
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`
  ];

  const checkContentQuality = (html) => {
    if (!html || html.length < 500) return false;
    if (html.includes("JavaScript is disabled") || html.includes("need to enable JavaScript")) return false;
    return true;
  };

  let finalHtml = "";
  let usedProxy = "";

  for (const getProxyUrl of proxies) {
    try {
      const proxyUrl = getProxyUrl(url);
      const resp = await fetch(proxyUrl);
      if (!resp.ok) continue;

      let html = "";
      if (proxyUrl.includes('allorigins')) {
        const data = await resp.json();
        html = data.contents;
      } else {
        html = await resp.text();
      }

      if (checkContentQuality(html)) {
        finalHtml = html;
        usedProxy = "static";
        break;
      }
    } catch (e) {
      console.warn(`Static proxy failed:`, e);
    }
  }

  if (!finalHtml) {
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const resp = await fetch(jinaUrl);
      if (resp.ok) {
        finalHtml = await resp.text();
        usedLevel2 = true;
      }
    } catch (e) {
      console.error("Jina Reader fallback failed:", e);
    }
  }

  if (!finalHtml) {
    return { title: url, metaDesc: '', bodyText: "網站內容受保護，僅能從網址特徵進行初步推論。", schemas: [], usedProxy: "fallback" };
  }

  const title = finalHtml.match(/<title>(.*?)<\/title>/i)?.[1] || url;
  const metaDesc = finalHtml.match(/<meta name="description" content="(.*?)"/i)?.[1] || '';
  const cleanHtml = finalHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  const bodyText = usedLevel2 ? finalHtml.substring(0, 5000) : cleanHtml.replace(/<[^>]+>/g, ' ')
                             .replace(/\s+/g, ' ')
                             .substring(0, 3000);

  const schemaMatches = finalHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  const schemas = schemaMatches?.map(m => {
    try {
      const json = m.replace(/<script type="application\/ld\+json">/i, '').replace(/<\/script>/i, '').trim();
      return JSON.parse(json);
    } catch { return null; }
  }).filter(Boolean);

  return { title, metaDesc, bodyText, schemas, usedProxy };
}

export function saveToDB(url, result) {
  try {
    const key = `aeo_cache_${url}`;
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data: result
    }));
  } catch (e) {
    console.error('Save to DB failed:', e);
  }
}

export function loadFromDB(url) {
  try {
    const key = `aeo_cache_${url}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const { data } = JSON.parse(saved);
    return data;
  } catch (e) {
    console.error('Load from DB failed:', e);
    return null;
  }
}

export function generateMockData(url) {
  const brandName = "範例品牌";
  return {
    step1: { brandIdentity: "示範身份", offerings: "示範產品", categories: "示範類別", audiences: "示範客群", differentiation: "示範差異" },
    step2: {}, step3: [], step4: [], step5: [], step6: {}
  };
}
