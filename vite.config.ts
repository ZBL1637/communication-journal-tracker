import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBase = (value: string | undefined) => {
  if (!value) {
    return '/';
  }

  if (value === './') {
    return './';
  }

  return value.endsWith('/') ? value : `${value}/`;
};

export default defineConfig({
  plugins: [react()],
  base: normalizeBase(process.env.VITE_APP_BASE),
  server: {
    port: 5173
  }
});
