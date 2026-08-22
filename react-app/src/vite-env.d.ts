/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_WEB3FORMS_KEY?: string;
  /** 'blob' forces the legacy single-jsonb cloud driver; anything else uses relational. */
  readonly VITE_CLOUD_DRIVER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
