# Pendências dos Documentos Legais — checar antes de produção

> Base: `termos-de-uso-v2.md` e `politica-de-privacidade-v2.md` (versões mais recentes).
> Não há arquivos `v3` em `docs/` — este checklist foi extraído dos **v2**.
> Lista apenas o que **continua em aberto**; itens cujas notas de revisão você já apagou nos v2
> foram considerados resolvidos e não aparecem aqui.

---

## 1. Dados obrigatórios ainda em branco (bloqueiam a publicação)

Esses campos precisam de dado real; hoje estão como placeholder ou meio preenchidos.

- [ ] **Razão social** — Termos §1 e Privacidade §1 ainda mostram `[RAZÃO SOCIAL]`. Nos v2 você
      adicionou a linha "Razão Social 00.000.000/0001-00", mas o **nome da empresa e o CNPJ real
      continuam sem preencher**.
- [ ] **CNPJ** — ainda `[00.000.000/0001-00]` nos dois documentos.
- [ ] **Endereço completo** — campo "Endereço Completo" está **vazio** nos dois documentos.
- [ ] **Comarca do foro** — Termos §11.5 ainda tem `[COMARCA DA SEDE]`. Recomendação: a comarca da
      sede. (Atenção: perante consumidor pessoa física, o art. 101 do CDC pode assegurar o foro do
      domicílio do consumidor.)
- [ ] **Data de "Última atualização"** — os dois docs dizem **3 de julho de 2026**. Atualizar para a
      data real de publicação.

---

## 2. Notas de revisão que permaneceram nos v2 (decisão/verificação pendente)

### Termos de Uso
- [ ] **§1 — Nota "substitua os campos entre colchetes"** — remover assim que os dados do item 1
      acima forem preenchidos.

### Política de Privacidade
- [ ] **§5 e §7 — Região do bucket Amazon S3.** Confirmar onde ficam as fotos. Se estiver no Brasil
      (ex.: `sa-east-1`), não há transferência internacional; se estiver no exterior, **incluir a
      Amazon como transferência internacional na §7**. (Nota de revisão ainda presente em §5 e §7.)
- [ ] **§3.1 — Logs de acesso (IP, data/hora).** Hoje o texto declara que você **não coleta** logs.
      Confirmar se isso segue verdade. Se passar a coletar (inclusive para o Marco Civil da Internet —
      guarda de registros por 6 meses), atualizar a seção.
- [ ] **§6 — Banner de consentimento de cookies.** Ainda marcado como pendente. Como há cookie de
      Google Analytics (não essencial), o recomendável é implementar banner com opção de recusa antes
      de carregar o Analytics. Decidir se entra antes do go-live.

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
- [ ] **Formatação da §1 (os dois docs).** O bloco de placeholder (citação `>`) e os campos manuais
      "Razão Social / Endereço" ficaram colados/quebrados. Revisar o layout ao preencher os dados
      reais.

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
