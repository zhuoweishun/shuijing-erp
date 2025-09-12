/// <reference types="vite/client" />;

interface import_meta_env {
  readonly VITE_API_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface import_meta {
  readonly env: import_meta_env
}