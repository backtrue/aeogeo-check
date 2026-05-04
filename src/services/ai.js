export function extractJsonFromText(text) {
  if (typeof text !== 'string') throw new Error('輸入必須是字串。');
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error('JSON 解析失敗。', { cause: error });
  }
}
