 export const config = {
  API_BASE_URL:
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:3000',
}

/* export const config = {
  API_BASE_URL: 'http://localhost:3000',
} */