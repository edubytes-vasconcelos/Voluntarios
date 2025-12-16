
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseado no modo atual (development/production)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    root: '.', // Configura o Vite para trabalhar com arquivos na raiz do projeto
    build: {
      outDir: 'dist', // Garante que a saída do build seja 'dist'
    },
    resolve: {
      // Correctly resolve __dirname for ESM context
      alias: {
        '@': path.resolve(path.dirname(import.meta.url), './'), // Alias '@' apontando para a raiz do projeto
      },
    },
    define: {
      // Expõe as variáveis de ambiente no objeto process.env para compatibilidade com o código existente
      'process.env': env
    }
  };
});
