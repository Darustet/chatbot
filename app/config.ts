export const config = {
  API_BASE_URL:
    typeof window !== 'undefined' && window.location?.hostname &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:3000',
}