# Pendências dos Documentos Legais — checar antes de produção

> Base: `termos-de-uso-v2.md` e `politica-de-privacidade-v2.md` (versões mais recentes).
> Não há arquivos `v3` em `docs/` — este checklist foi extraído dos **v2**.
> Lista apenas o que **continua em aberto**; itens cujas notas de revisão você já apagou nos v2
> foram considerados resolvidos e não aparecem aqui.

---

## 1. Dados obrigatórios ainda em branco (bloqueiam a publicação)

- [x] **Identificação do prestador** — decisão de escopo (2026-07-20): a Kashing **não abrirá CNPJ**
      para a fase de testes; a plataforma passa a ser operada por **pessoa física**. Termos §1 e
      Privacidade §1 foram atualizados de "razão social/CNPJ" para **Ítalo Gavassi dos Santos, CPF
      109.605.269-51, domicílio em Avenida Brasil, 3200, Maringá — Paraná**. Reavaliar se/quando a
      operação migrar para pessoa jurídica (CNPJ).
- [x] **Comarca do foro** — Termos §11.5 preenchida com **Maringá, Estado do Paraná** (domicílio do
      prestador pessoa física). Atenção: perante consumidor pessoa física, o art. 101 do CDC pode ainda
      assegurar o foro do domicílio do consumidor.
- [x] **Data de "Última atualização"** — atualizada para **20 de julho de 2026** nos dois v2.

---

## 2. Notas de revisão que permaneceram nos v2 (decisão/verificação pendente)

### Política de Privacidade
- [ ] **§5 e §7 — Região do bucket Amazon S3.** Confirmar onde ficam as fotos. Se estiver no Brasil
      (ex.: `sa-east-1`), não há transferência internacional; se estiver no exterior, **incluir a
      Amazon como transferência internacional na §7**. (Nota de revisão ainda presente em §5 e §7.)
- [ ] **§3.1 — Logs de acesso (IP, data/hora).** Hoje o texto declara que você **não coleta** logs.
      Confirmar se isso segue verdade. Se passar a coletar (inclusive para o Marco Civil da Internet —
      guarda de registros por 6 meses), atualizar a seção.
- [x] **§6 — Banner de consentimento de cookies.** Resolvido: banner implementado na landing page
      (`CookieConsent.astro`), com aceitar/recusar, e o Google Analytics só é ativado (Consent Mode)
      após aceite. Nota de "Pendente" removida do §6.2.

---

## 3. Inconsistências deixadas na edição da v2 (corrigir antes de publicar)

- [ ] **"Owner" ainda aparece na Política.** Nos Termos v2 você padronizou para "Dono do
      estabelecimento", mas a Política ainda diz **"Owner"** em três pontos: §3.1 ("senha do Owner"),
      §5 ("autenticação do Owner") e §8.3 ("dados cadastrais do Owner"). Padronizar.
- [ ] **Typo "Funcionario"** — Política §7.3 escreve `Funcionario` (sem acento). Ajustar para
      "Funcionário", conforme o resto do texto.
- [ ] **Política §3.3 — foto do funcionário.** A nota que explicava por que a foto **não** é dado
      biométrico foi removida, mas o texto ainda a lista como "exceção" aos dados sensíveis — o que dá
      a entender que ela é sensível. Confirmar que **não há reconhecimento facial** e considerar
      reescrever a frase para não classificar a foto como sensível.
- [x] **Formatação da §1 (os dois docs).** Bloco de placeholder e campos manuais duplicados removidos
      ao preencher os dados reais (pessoa física).

---

## 4. Confirmar (menor prioridade)

- [ ] **Marketing (Privacidade §4).** A tabela ainda lista comunicação de marketing por consentimento
      + opt-out. Se ainda não faz marketing, tudo bem manter — mas só disparar comunicação promocional
      após coletar consentimento específico.

---

## 5. Recomendação geral

- [ ] **Revisão por advogado antes do go-live.** Você resolveu e removeu as notas das cláusulas de
      reembolso (Termos §5.4), inadimplência/reajuste (§5.5) e limitação de responsabilidade (§9,
      teto de 6 meses). Ainda assim, essas são justamente as cláusulas mais sensíveis perante o Código
      de Defesa do Consumidor — vale uma validação jurídica final.
