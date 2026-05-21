function isLocalAddress(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function getApiBaseUrl(): string {
  const envUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
  const hasWindow = typeof window !== 'undefined' && Boolean(window.location?.origin);
  const webOrigin = hasWindow ? window.location.origin : '';

  // On deployed web, always prefer same-origin to avoid bad localhost fallbacks.
  if (webOrigin && !isLocalAddress(webOrigin)) {
    return webOrigin;
  }

  if (envUrl) {
    return envUrl;
  }

  if (webOrigin) {
    return webOrigin;
  }

  return 'http://localhost:3000';
}

export const config = {
  API_BASE_URL: getApiBaseUrl(),
}

/* export const config = {
  API_BASE_URL: 'http://localhost:3000',
} */