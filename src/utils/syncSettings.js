const KEY_BASE_URL = 'museum_base_url';
const KEY_TOKEN = 'museum_token';

export function getSyncSettings() {
  return {
    baseUrl: localStorage.getItem(KEY_BASE_URL) ?? '',
    token: localStorage.getItem(KEY_TOKEN) ?? '',
  };
}

export function saveSyncSettings({ baseUrl, token }) {
  localStorage.setItem(KEY_BASE_URL, baseUrl.trim().replace(/\/$/, ''));
  localStorage.setItem(KEY_TOKEN, token.trim());
}
