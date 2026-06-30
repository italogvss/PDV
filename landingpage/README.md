# Landing Page — Ka$hing

Landing page do Ka$hing (PDV Ultra), feita em **Astro 7**. Site estático com múltiplas páginas, suporte a tema claro/escuro, e animações CSS puras.

---

## O que é Astro

Astro é um framework de sites estáticos. A diferença principal pra React/Vue:

- **Sem JS no cliente por padrão.** O HTML já vem pronto do servidor (ou da build). JavaScript só existe onde você explicitamente colocar.
- **Arquivos `.astro`** são como componentes — têm uma seção de lógica (entre `---`) e uma seção de template (HTML).
- **Pages** viram rotas automaticamente: `src/pages/preco.astro` → `/preco`.

Formato de um `.astro`:

```astro
---
// Isso roda no servidor/build. Pode importar, buscar dados, etc.
const nome = "Ka$hing";
---

<!-- Isso é o HTML que vai pro browser -->
<h1>Olá, {nome}</h1>

<style>
  /* CSS scoped — só afeta esse componente */
  h1 { color: green; }
</style>

<script>
  // JavaScript que roda no browser
  console.log("oi");
</script>
```

---

## Estrutura de pastas

```
landingpage/
├── src/
│   ├── pages/              ← cada arquivo vira uma rota
│   │   ├── index.astro     → /
│   │   ├── preco.astro     → /preco
│   │   ├── solucoes.astro  → /solucoes
│   │   └── faq.astro       → /faq
│   │
│   ├── layouts/
│   │   └── Layout.astro    ← layout base (HTML, head, SEO, tema, reveal)
│   │
│   ├── components/
│   │   ├── Navbar.astro    ← barra de navegação (sticky, glassmorphism)
│   │   ├── Footer.astro    ← rodapé
│   │   ├── CtaFinal.astro  ← seção de CTA de conversão (reutilizável)
│   │   ├── PlanCard.astro  ← card de plano individual
│   │   ├── Accordion.astro ← FAQ accordion
│   │   └── ThemeToggle.astro ← botão flutuante de tema
│   │
│   └── styles/
│       ├── tokens.css      ← ÚNICA fonte de verdade: cores, fontes, espaçamento
│       └── global.css      ← reset + estilos base, importa tokens.css
│
├── brand_assets/
│   └── logo-black.png      ← logo oficial
│
├── design/
│   ├── prompt.md           ← briefing visual
│   └── fonts/              ← arquivos de fonte (.otf, .ttf)
│
├── public/                 ← arquivos servidos diretamente (favicon, fonts, logo)
├── .env.example            ← variáveis de ambiente necessárias
├── astro.config.mjs        ← configuração do Astro
├── Dockerfile              ← build de produção com nginx
└── nginx.conf              ← config do nginx para deploy
```

---

## Como rodar

```bash
cd landingpage
npm install      # primeira vez
npm run dev      # inicia em http://localhost:4321
```

A página recarrega automaticamente ao salvar qualquer arquivo (hot reload).

---

## Como as páginas funcionam

Toda página usa o componente `Layout.astro` como wrapper. Ele cuida de:

- `<head>` com SEO, meta tags e Open Graph
- Carregamento das fontes
- Prevenção de flash de tema errado (FOUC)
- Animações de reveal no scroll (`data-reveal`)
- Google Analytics 4 (condicional, só se `PUBLIC_GA_MEASUREMENT_ID` estiver definido)

Exemplo de uso:

```astro
---
import Layout from '../layouts/Layout.astro';
import Navbar from '../components/Navbar.astro';
---

<Layout title="Título da página" description="Descrição para o Google">
  <Navbar />
  <main>
    <!-- conteúdo aqui -->
  </main>
</Layout>
```

---

## Sistema de design (tokens)

**Nunca escrever cores, tamanhos ou espaçamentos diretamente.** Tudo fica em `src/styles/tokens.css` como CSS custom properties.

### Referência rápida

| Categoria | Exemplos |
|---|---|
| Cores de marca | `--color-brand`, `--color-brand-dark`, `--color-brand-deep` |
| Cores de texto | `--color-ink`, `--color-text-muted`, `--color-text-faint` |
| Superfícies | `--color-surface`, `--color-card`, `--color-cloud`, `--color-mint` |
| Fontes | `--font-display` (Coolvetica — headings), `--font-body` (Geist — corpo) |
| Escala de texto | `--text-xs` até `--text-7xl` |
| Espaçamento | `--space-1` (0.25rem) até `--space-16` (8rem) |
| Bordas | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` |
| Sombras | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow` |
| Animações | `--ease-spring`, `--ease-out`, `--dur-fast`, `--dur-base`, `--dur-slow` |

```css
/* ✅ correto */
.meu-titulo { color: var(--color-brand); font-size: var(--text-4xl); }

/* ❌ errado */
.meu-titulo { color: #25cf3f; font-size: 3rem; }
```

### Tema escuro

Funciona via atributo `data-theme="dark"` no `<html>`. O `Layout.astro` lê o `localStorage` antes da pintura para evitar flash. `ThemeToggle.astro` troca o tema no clique.

No `tokens.css`, a paleta neutra (superfícies + texto) é sobrescrita em `:root[data-theme='dark']`. As cores de marca (verde) ficam iguais nos dois temas.

---

## Animações de reveal no scroll

Qualquer elemento com `data-reveal` entra com animação quando aparece na viewport:

```html
<section data-reveal>Conteúdo</section>

<!-- Com delay (útil para animar itens em sequência) -->
<li data-reveal style="--reveal-delay: 90ms">Item</li>
```

A lógica fica no `Layout.astro` via `IntersectionObserver`. Adiciona a classe `.in-view` quando o elemento entra na tela, que ativa a transição definida no `global.css`.

---

## Variáveis de ambiente

Crie um `.env` na raiz de `landingpage/` baseado no `.env.example`:

```env
PUBLIC_APP_URL=http://localhost:5173        # URL do app React (frontend PDV)
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX      # GA4 — deixar vazio para desativar
```

Variáveis com prefixo `PUBLIC_` são expostas ao browser. Sem esse prefixo, ficam só no servidor/build.

Acesso no código:

```astro
---
const appUrl = import.meta.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
---
<a href={`${appUrl}/cadastro`}>Criar conta</a>
```

---

## Adicionando uma nova página

1. Criar `src/pages/nova-pagina.astro`
2. Usar o layout e componentes:

```astro
---
import Layout from '../layouts/Layout.astro';
import Navbar from '../components/Navbar.astro';
import Footer from '../components/Footer.astro';
import CtaFinal from '../components/CtaFinal.astro';
---

<Layout title="Nova Página" description="Descrição aqui">
  <Navbar />
  <main>
    <section class="section">
      <div class="container">
        <h1>Conteúdo</h1>
      </div>
    </section>
    <CtaFinal />
  </main>
  <Footer />
</Layout>
```

3. Adicionar o link em `Navbar.astro` no array `links`

---

## Adicionando um novo componente

1. Criar `src/components/MeuComponente.astro`
2. Definir props na seção `---`:

```astro
---
interface Props {
  titulo: string;
  subtitulo?: string;  // opcional
}
const { titulo, subtitulo = 'Valor padrão' } = Astro.props;
---

<div class="meu-componente">
  <h2>{titulo}</h2>
  {subtitulo && <p>{subtitulo}</p>}
</div>

<style>
  .meu-componente { padding: var(--space-6); }
</style>
```

3. Usar na página:

```astro
---
import MeuComponente from '../components/MeuComponente.astro';
---
<MeuComponente titulo="Olá" subtitulo="Mundo" />
```

---

## Deploy

O projeto tem um `Dockerfile` que faz build estático e serve via nginx.

```bash
# Build de produção (fora do Docker)
npm run build   # gera dist/

# Com Docker
docker build -t kashing-landing .
docker run -p 80:80 kashing-landing
```

---

## Diferenças de Astro vs React que vão pegar você

| React | Astro |
|---|---|
| `className` | `class` |
| `{condition && <El />}` | funciona igual |
| `import styles from './x.module.css'` | CSS fica no `<style>` do próprio arquivo |
| Hooks (`useState`, `useEffect`) | não existem em `.astro` — use `<script>` para JS interativo |
| Re-renders dinâmicos | não tem — é HTML estático. Para interatividade, use `<script>` |
| JSX retorna um elemento | o template `.astro` retorna o HTML diretamente |

Para listas, use `Array.map()` igual ao React:

```astro
---
const itens = ['A', 'B', 'C'];
---
<ul>
  {itens.map((item) => <li>{item}</li>)}
</ul>
```
