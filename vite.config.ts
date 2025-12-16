
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseado no modo atual (development/production)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Expõe as variáveis de ambiente no objeto process.env para compatibilidade com o código existente
      'process.env': env
    },
    resolve: {
      alias: {
        // Mapeia '@' para o diretório './src'
        // Assumimos que o vite.config.ts está na raiz do projeto e o código frontend em 'src/'
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
