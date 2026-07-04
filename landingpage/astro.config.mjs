import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  // satteri (processador nativo padrão do Astro 7) usa um binário Rust que
  // pode ser bloqueado por políticas de Application Control — usamos o
  // pipeline remark/rehype (puro JS) para evitar essa dependência nativa.
  markdown: {
    processor: unified(),
  },
});
