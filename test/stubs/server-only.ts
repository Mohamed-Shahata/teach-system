// `server-only` throws when imported outside a bundler that resolves its
// "react-server"/browser package.json export conditions (webpack in Next.js
// does; plain Node under Vitest doesn't). This stub is aliased in place of
// the real package for tests so server-only modules remain importable
// without weakening the real guard used at build/runtime.
export {};
