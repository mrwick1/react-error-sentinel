import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.tsx',
    dashboard: 'src/dashboard/index.tsx',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false, // Keep readable for MVP
  external: ['react', 'react-dom', 'redux', 'zustand', 'axios'],
});
