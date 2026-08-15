// In dev: proxied via Vite at /progym-api -> https://tavrostechinfo.com/PROGYM/ggs/api
// In prod: hits the live API directly at the absolute URL.
export const API_BASE = import.meta.env.DEV
  ? '/progym-api'
  : 'https://tavrostechinfo.com/PROGYM/ggs/api'
