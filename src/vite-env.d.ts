/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "shop" builds the staff app (for its own Netlify site); anything else builds the public website. */
  readonly VITE_APP_TARGET?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
