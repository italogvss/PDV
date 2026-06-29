# CLAUDE.md — Landing Page PDV Ultra

## Always Do First
- Verificar `brand_assets/` antes de escrever qualquer código de UI.
- Se há imagem de referência em `design/`: ler e comparar antes de começar.

## Reference Images
- Se imagem de referência fornecida: replicar layout, espaçamento, tipografia e cores exatamente. Usar placeholders para conteúdo (imagens via `https://placehold.co/`, texto genérico). Não melhorar nem adicionar ao design.
- Se sem referência: criar do zero com alta qualidade (ver guardrails abaixo).
- Tirar screenshot, comparar com referência, corrigir diferenças, re-screenshot. Mínimo 2 rodadas. Parar só quando não houver diferenças visíveis ou usuário confirmar.

## Local Server
- Sempre servir em localhost — nunca screenshot de `file:///`.
- Iniciar o dev server: `npm run dev` (serve em `http://localhost:4321`)
- Rodar em background antes de tirar screenshots.
- Se o servidor já estiver rodando, não iniciar uma segunda instância.
- **O container Docker não é necessário para visualizar** — o dev server é suficiente e mais rápido (hot reload). O container existe apenas para produção.

## Screenshot Workflow
- Puppeteer instalado como devDependency no projeto.
- **Sempre screenshot de localhost:** `node screenshot.mjs http://localhost:4321`
- Screenshots salvos em `./screenshots/screenshot-N.png` (auto-incrementado, nunca sobrescreve).
- Sufixo de label opcional: `node screenshot.mjs http://localhost:4321 label` → salva como `screenshot-N-label.png`
- `screenshot.mjs` fica na raiz do projeto. Usar como está.
- Após screenshot, ler o PNG de `screenshots/` com a ferramenta Read — Claude consegue ver e analisar a imagem diretamente.
- Ao comparar, ser específico: "heading está em 32px mas referência mostra ~24px", "gap do card está em 16px mas deveria ser 24px"
- Verificar: spacing/padding, tamanho/peso/line-height de fonte, cores (hex exato), alinhamento, border-radius, sombras, tamanho de imagens

## Output Defaults
- Componentes `.astro` em `src/pages/` e `src/components/`
- Estilos em `<style>` scoped dentro do componente, ou em `src/styles/` para estilos globais
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsivo

## Brand Assets
- Verificar `brand_assets/` antes de criar qualquer design. Pode conter logos, guias de cor, style guides ou imagens.
- Se assets existirem, usá-los. Não usar placeholders onde há assets reais.
- Se logo presente, usá-lo. Se paleta de cores definida, usar esses valores exatos — não inventar cores de marca.

## Anti-Generic Guardrails
- **Cores:** Nunca hardcodar valores de cor. Usar tokens de `src/styles/tokens.css` — derivar sempre da cor brand.
- **Sombras:** Nunca sombra plana. Usar camadas com tint de cor e baixa opacidade via `var(--shadow-sm/md/lg)`.
- **Tipografia:** Nunca usar a mesma fonte para headings e body. Usar `var(--font-display)` para headings e `var(--font-body)` para corpo. Tracking apertado (`-0.03em`) em headings grandes, line-height generoso (`1.7`) no body.
- **Gradientes:** Camadas de múltiplos radial gradients. Adicionar grain/textura via SVG noise filter para profundidade.
- **Animações:** Animar apenas `transform` e `opacity`. Nunca `transition-all`. Usar spring-style easing.
- **Estados interativos:** Todo elemento clicável precisa de estados hover, focus-visible e active. Sem exceções.
- **Imagens:** Adicionar overlay de gradiente e camada de tratamento de cor com `mix-blend-mode: multiply`.
- **Espaçamento:** Usar tokens de `src/styles/tokens.css` — não valores aleatórios.
- **Profundidade:** Superfícies com sistema de camadas (base → elevated → floating), não tudo no mesmo z-plane.

## Hard Rules
- Não adicionar seções, features ou conteúdo que não estejam na referência
- Não "melhorar" um design de referência — replicar
- Não parar após um único screenshot
- Não usar `transition-all`
- Nunca hardcodar cores, fontes ou espaçamentos — sempre usar variáveis de `src/styles/tokens.css`

---

## Stack (Astro 7)

Este projeto usa **Astro 7**. Estrutura de pastas:

```
src/
├── layouts/Layout.astro     ← layout base com SEO, importa global.css
├── pages/index.astro        ← página inicial
├── components/              ← componentes reutilizáveis
└── styles/
    ├── tokens.css           ← ÚNICA fonte de verdade para tokens visuais
    └── global.css           ← reset + base styles, importa tokens.css
```

Variáveis de ambiente com prefixo `PUBLIC_` são acessíveis no client-side.

## Centralização de Tema (Design Tokens)

**Nunca espalhar cores, fontes ou espaçamentos diretamente nos componentes.** Toda decisão visual fica em `src/styles/tokens.css`.

`Layout.astro` importa `global.css` que importa `tokens.css` — todos os componentes herdam via CSS custom properties.

### Uso correto

```astro
<!-- ✅ correto -->
<style>
  .titulo { color: var(--color-brand); font-size: var(--text-4xl); }
</style>

<!-- ❌ errado: valor hardcoded -->
<style>
  .titulo { color: #00000; font-size: 2.25rem; }
</style>
```

### Tokens disponíveis (`src/styles/tokens.css`)

- Cores: `--color-brand`, `--color-brand-light`, `--color-brand-dark`, `--color-surface`, `--color-text`, `--color-text-muted`
- Tipografia: `--font-display` (headings), `--font-body` (corpo)
- Escala de texto: `--text-xs` → `--text-6xl`
- Espaçamento: `--space-1` → `--space-16`
- Bordas: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
- Sombras: `--shadow-sm`, `--shadow-md`, `--shadow-lg`

## Design de Referência

- Imagem de referência: `design/landingpage.jpg`
- Brand assets (logo, paleta oficial): `brand_assets/`
- Logo `brand_assets/logo-black.png`
