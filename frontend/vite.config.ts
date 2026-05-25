import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['host.docker.internal'],
    port: 5173,
    proxy: {
      // Vite roda DENTRO do container pdv-frontend; o alvo e o nome do
      // servico Docker, nao localhost. Em producao o nginx.prod.conf
      // faz esse mesmo roteamento de /api para a API.
      '/api': { target: 'http://api:8080', changeOrigin: true },
    },
    watch: {
      // Bind mount Windows->Linux nao emite eventos de fs;
      // sem polling o HMR nao dispara.
      usePolling: true,
    },
  },
})
