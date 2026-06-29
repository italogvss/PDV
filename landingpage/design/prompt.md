Contexto do Produto
SaaS de PDV com analytics para pequenos e médios comércios. Sem freemium — modelo trial. A landing page tem um único trabalho: convencer quem nunca ouviu falar do produto a criar uma conta antes de sair da página.
Regras Globais
Antes de qualquer código:

Ler brand_assets/ para logo e paleta oficial
Verificar design/landingpage.jpg se existir
Fontes: Coolvetica → --font-display, Geist → --font-body, configuradas em tokens.css
Todos os tokens visuais exclusivamente em src/styles/tokens.css
Seguir todos os Anti-Generic Guardrails e Hard Rules do CLAUDE.md

Uso da Tipografia
Coolvetica carrega autoridade e personalidade — reservada para os momentos em que o produto precisa falar alto: headlines de hero, nomes de seção e qualquer texto que precise parar o olho do visitante. Geist é legível e neutra — usada em tudo que precisa ser lido com conforto: parágrafos, listas, labels, preços, perguntas de FAQ.
A regra prática é: se o texto vende, é Coolvetica. Se o texto explica, é Geist.

Navegação Global
Existe para orientar o visitante entre as quatro páginas e nunca desaparecer. O CTA de trial fica fixo nela porque o momento de conversão pode acontecer em qualquer scroll.

Página 1 — Home
Propósito: ser a porta de entrada. Não precisa explicar tudo — precisa criar desejo e empurrar para o trial ou para as páginas de detalhe.
Hero — Único trabalho: fazer o visitante entender em 5 segundos o que é o produto e para quem é. A demonstração visual do produto aparece aqui porque ver uma tela real elimina a abstração e constrói confiança antes de qualquer palavra.
Barra de segmentos — Responde a pergunta silenciosa "isso é para mim?". Quem tem barbearia precisa se ver ali. Quem tem mercadinho também. Resolve ansiedade de segmentação sem texto longo.
Problema → Solução — Cria identificação antes de vender. O visitante precisa reconhecer a dor dele na página para acreditar que o produto resolve. Linguagem de dono de negócio pequeno, não de software.
Demonstração de funcionalidades — Aqui o produto prova o que prometeu. Cada funcionalidade core aparece com uma tela real porque é mais convincente do que uma lista de bullet points. O visitante que chegou aqui está avaliando — precisa de evidência.
Depoimentos — Quem fala não é a empresa, é quem já usa. Segmento e cidade importam porque o visitante quer ver alguém parecido com ele, não um depoimento genérico.
Resumo de planos — Não é para fechar venda de plano aqui — é para mostrar que tem uma opção acessível e tirar o medo de "vai ser caro demais". Direciona para /preco quem quer detalhe.
CTA final — Última chance antes do rodapé. Reforça que não precisa de cartão — remove a última objeção de quem ainda não clicou.

Página 2 — Soluções
Propósito: ser a página para quem quer entender o produto antes de decidir. O visitante chegou aqui porque quer saber se o PDV Ultra faz o que ele precisa — funcionalidades específicas, não promessas vagas.
Hero — Reorienta o visitante: ele saiu da Home e entrou em modo de avaliação. O hero confirma que essa página responde às dúvidas de "o que exatamente esse sistema faz".
Índice de módulos — Permite navegação direta. Quem tem barbearia vai direto em Agendamentos. Quem tem mercadinho vai em Estoque. A página não obriga leitura linear.
Detalhe de cada módulo — Cada módulo existe para eliminar uma dúvida específica com evidência visual. A screenshot prova que a funcionalidade existe. As capacidades concretas descrevem o que o usuário vai conseguir fazer, não o que o sistema tecnicamente suporta. Os badges de segmento reforçam relevância para o contexto de quem está lendo.
CTA de encerramento — Quem leu até aqui já conhece o produto. O CTA aparece quando o visitante está no pico de entendimento.

Página 3 — Preço
Propósito: resolver a objeção de preço e fechar a decisão. Visitante aqui já quer o produto — a dúvida é se vai caber no bolso e se existe pegadinha.
Hero — Posiciona o preço como justo antes de mostrar os números. Reforça trial e ausência de fidelidade logo de cara porque são os maiores medos de quem assina SaaS pela primeira vez.
Toggle mensal / anual — Dá controle ao visitante e mostra transparência. A economia anual em destaque é um empurrão para o plano de maior valor por conversão.
Grade de planos — O trabalho dela é fazer o visitante escolher um plano, não comparar infinitamente. Por isso o plano recomendado tem destaque visual. O CTA de cada card é trial, não compra — tira o risco da decisão.
Tabela comparativa — Para quem precisa ter certeza antes de agir. Alguns perfis de visitante precisam ver tudo antes de clicar. A tabela existe para eles, não para a maioria.
Perguntas sobre cobrança — As quatro objeções restantes mais comuns sobre dinheiro: fim do trial, cancelamento, método de pagamento e fidelidade. Resolve sem precisar de suporte.
CTA final — Mesmo padrão das outras páginas.

Página 4 — FAQ
Propósito: ser o suporte de pré-venda. Quem chega aqui tem uma dúvida específica que travou a decisão. A página precisa responder rápido e mandar o visitante de volta para o trial.
Hero com busca — O visitante não quer ler 30 perguntas — quer encontrar a dele. A busca em tempo real serve isso sem fricção.
Perguntas por categoria — Organiza por perfil de dúvida: quem tem dúvida técnica vai em Funcionalidades, quem tem medo de cobranças vai em Planos e Cobrança. Cada resposta usa Geist, linguagem simples, sem jargão — porque o público-alvo não é técnico.
CTA de encerramento — Duas saídas: quem ainda tem dúvida vai para o contato, quem já resolveu vai para o trial. Nenhum visitante termina a página sem uma ação possível.

Componentes Compartilhados
Navbar.astro, Footer.astro, CtaFinal.astro, Accordion.astro, PlanCard.astro — existem porque as mesmas estruturas se repetem entre páginas. Mudança de texto ou estilo num componente reflete em todo o site.