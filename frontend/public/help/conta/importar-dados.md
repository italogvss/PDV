# Importar dados via CSV

A importação permite **cadastrar vários itens de uma vez** a partir de uma planilha `.csv` — útil para migrar de outro sistema ou subir um catálogo montado no Excel.

## Onde fica

Acesse **Configurações > Backup & dados**. No cartão **Importar dados**:

1. Em **Tipo de dado**, escolha o que o arquivo contém (Produtos, Clientes ou Serviços).
2. Clique em **Selecionar arquivo** e escolha o `.csv`.
3. Clique em **Importar**.

## Como montar o arquivo

> A forma mais fácil é **exportar** primeiro aquele tipo de dado (cartão *Exportar dados*), abrir o arquivo, ajustar/adicionar as linhas e reimportar. As colunas já vêm no formato certo.

As colunas seguem exatamente o cabeçalho do arquivo exportado. A ordem das colunas não importa, e colunas extras (como *Cadastrado em*) são ignoradas. Colunas obrigatórias por tipo:

- **Produtos** — `Produto` e `Preço` são obrigatórios. Opcionais: `Código de Barras`, `NCM`, `Estoque`, `Ativo`, `Categoria`.
- **Clientes** — só `Nome` é obrigatório. Opcionais: `Telefone`, `E-mail`, `CPF/CNPJ`, `Rua`, `Número`, `Cidade`, `Estado`, `CEP`.
- **Serviços** — `Nome` e `Preço` são obrigatórios. Opcionais: `Descrição`, `Duração (min)`, `Categoria`, `Ativo`.

Valores numéricos aceitam vírgula ou ponto (`19,90` ou `19.90`). A coluna `Ativo` aceita `Sim`/`Não`.

## Regras

> **Tudo ou nada.** O arquivo inteiro é validado no envio. Se **qualquer linha** tiver erro, a importação é cancelada e **nenhum** registro é criado — a mensagem indica a linha a corrigir.

- **Um arquivo por vez**, somente `.csv`.
- Limite de **2 MB** e **1.000 linhas** por importação.
- **Categorias** informadas em Produtos/Serviços que ainda não existem são **criadas automaticamente** durante a importação.
- Para produtos, o **código de barras** não pode se repetir (nem no arquivo, nem com um produto já cadastrado).
