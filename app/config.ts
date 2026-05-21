function getApiBaseUrl() {
  const storedUrl = getStoredApiUrl();
  if (storedUrl) {
    return storedUrl;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (!isLocalHost) {
      return window.location.origin;
    }
  }

  return 'http://localhost:3000';
}

function getStoredApiUrl() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('backend_api_url');
    }
  } catch {
    return null;
  }

  return null;
}

export const config = {
  API_BASE_URL: getApiBaseUrl(),
}