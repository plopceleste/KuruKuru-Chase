import { defineConfig } from 'vite';

export default defineConfig({
  // Relative so the build works from a project page (user.github.io/KuruKuru-Chase)
  // as well as from a domain root or a file:// checkout.
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0
  }
});
