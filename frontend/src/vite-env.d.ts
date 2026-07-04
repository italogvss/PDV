/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  // URL do site de marketing (landing). Destino do redirect após cancelar em trial + logout.
  readonly VITE_LANDING_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
