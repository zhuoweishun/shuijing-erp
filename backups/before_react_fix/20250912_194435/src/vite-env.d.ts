/// <reference types="vite/client" />;

interface import_meta_env Readonly VITE_API_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface import_meta Readonly env: import_meta_env
}