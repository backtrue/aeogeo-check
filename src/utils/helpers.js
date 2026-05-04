export const normalizeUrl = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch (error) {
    console.error('Invalid URL:', error);
    return trimmed;
  }
};

export function saveToDB(url, result) {
  try {
    const key = `aeo_cache_${url}`;
    localStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data: result
    }));
  } catch (error) {
    console.error('Save to DB failed:', error);
  }
}

export function loadFromDB(url) {
  try {
    const key = `aeo_cache_${url}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const { data } = JSON.parse(saved);
    return data;
  } catch (error) {
    console.error('Load from DB failed:', error);
    return null;
  }
}
