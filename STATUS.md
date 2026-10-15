# Status da entrega

**Nome:** r-acosta-net
**Tempo total gasto (aprox.):** 5h30. Foram duas sessões: 13/10, das 14:53 às 17:15, e 15/10, das 00:52 às ~04:00 (horário de Nova York). A pausa entre elas não está contada.

**Como trabalhei:**
- Usei o Claude Code em todas as tarefas. As conversas estão em [`sessoes/`](sessoes/).
- Antes de mexer no código, fiz uma análise geral do projeto e uma análise de cada tarefa: causa raiz e opções de solução.
- Em cada tarefa, **escrevi os testes primeiro e fiz commit deles falhando**; a correção veio num commit seguinte. O histórico de cada PR mostra o "antes" e o "depois".

| Tarefa | Situação | PR | Testes na branch |
|---|---|---|---|
| 3: dado de outra empresa | pronta | [#1](https://github.com/r-acosta-net/prova-desenvolvedor/pull/1) | 26/26 |
| 1: tela de tarefas | pronta | [#2](https://github.com/r-acosta-net/prova-desenvolvedor/pull/2) | 15/15 |
| 2: relatório de vendas | pronta | [#3](https://github.com/r-acosta-net/prova-desenvolvedor/pull/3) | 87/87 |
| 5: exportar para o Excel | pronta | [#4](https://github.com/r-acosta-net/prova-desenvolvedor/pull/4) | 49/49 |
| 4: prazo em dias úteis | pronta | [#5](https://github.com/r-acosta-net/prova-desenvolvedor/pull/5) | 91/91 |

**As 5 branches juntas** (merge simulado numa cópia temporária, sem tocar nas branches): **sem conflito, 260/260 testes** em America/Sao_Paulo, UTC, Pacific/Kiritimati (UTC+14) e Pacific/Pago_Pago (UTC−11).

## Ordem em que trabalhei

**3 → 1 → 2 → 5 → 4.**

1. **Tarefa 3 primeiro:** era a única urgente e é de segurança. Um cliente estava vendo dados de outras empresas, o que pode ser incidente de vazamento de dados.
2. **Tarefa 1:** usa a mesma regra da árvore de empresas da 3, e a Tarefa 5 depende dela ("exportar as tarefas mostradas na tela").
3. **Tarefa 2:** número financeiro errado, com causa bem delimitada.
4. **Tarefa 5:** rápida, mas os dados já traziam os casos traiçoeiros (tarefas 112 e 114).
5. **Tarefa 4 por último:** a maior. Pede pesquisa de API, comando novo, arquivo de dados e mudança na tela.

Cada branch sai da `main`, como pedido. Para não gerar conflito entre as PRs, as mudanças no `App.jsx` foram feitas em linhas separadas, e a tabela da Tarefa 4 ficou num componente próprio.

## Tarefa 1 — Tela de tarefas

- **Situação:** pronta.
- **Qual era o problema:** duas causas em `listarTarefas`.
  - **Árvore ignorada.** O filtro era `t.empresa_id === empresaId`, e a lista `empresas` era recebida mas nunca usada. Como o Grupo Aurora não tem tarefas próprias, a tela vinha vazia. Pelo mesmo motivo, a Aurora Serviços não via a Aurora Campo.
  - **Período sem as pontas.** `>` e `<` descartavam **os dois dias das pontas**, não só o último que o usuário percebeu. O teste que já existia passava por coincidência.
  - **Ajustes extras:**
    - comparar só o dia de `criada_em`, que pode vir com hora;
    - campo de data limpo deixa aquele lado do período em aberto;
    - aviso na tela quando a data inicial é maior que a final (antes aparecia só "Nenhuma tarefa no período");
    - ordem estável por id.
- **Como provei que funciona:**
  - **Testes:** commitados antes da correção, quando 8 de 13 falhavam. Agora 15/15.
  - **Na tela, padrão 01/09–31/10:**

    | Empresa | Antes | Depois |
    |---|---|---|
    | Grupo Aurora | 0 tarefas | **13** |
    | Aurora Serviços | 4 | **9** |

    Com a Aurora Serviços em setembro, aparecem as tarefas de 01/09 e 30/09.
  - **Período invertido:** a tela mostra o aviso.
- **PR:** [#2](https://github.com/r-acosta-net/prova-desenvolvedor/pull/2)

## Tarefa 2 — Relatório de vendas

- **Situação:** pronta.
- **Qual era o problema:** três causas somadas, conferidas venda por venda.
  1. **Dia em UTC.** O dia vinha de `criada_em.slice(0, 10)`, que é o dia em UTC. Brasília é UTC−3, então a V-0990 (30/09, 23h em Brasília) entrava em 01/10, e a V-0995 e a V-0996 (01/10 depois das 21h) saíam.
  2. **Vendas repetidas pela sincronização.** A V-0992 e a V-0994 eram somadas duas vezes. Agora cada id conta uma vez, valendo a última ocorrência.
  3. **Ticket médio** (fora do pedido): dividia também pelas vendas canceladas e repetidas. Dava R$ 643,00; o correto é **R$ 680,10**.
  - **Ajustes extras:**
    - soma em centavos;
    - **data inválida agora é erro.** Antes, `npm run relatorio -- 01/10/2026` imprimia "R$ 0,00" e terminava com sucesso (código 0). Numa rotina agendada, isso passaria como verdadeiro.
- **Como provei que funciona:**
  - **Resultado:** **R$ 4.501,00 → R$ 3.400,50.**
  - **Conservação:** a soma de 30/09 a 03/10 é igual ao total das vendas pagas únicas (R$ 8.620,50). Antes dava R$ 10.971,00, e a diferença é exatamente o valor das 3 vendas repetidas.
  - **Testes:**
    - viradas às 03:00 UTC e horário de verão de 2018;
    - **bateria de 74 entradas inválidas.** Antes, 18 delas imprimiam R$ 0,00 com sucesso. Agora todas dão erro, com código 1.
  - **Fusos:** testado em 5 fusos reais.
- **PR:** [#3](https://github.com/r-acosta-net/prova-desenvolvedor/pull/3)

## Tarefa 3 — Cliente vendo dado de outra empresa

- **Situação:** pronta.
- **Qual era o problema:** em `sql/schema.sql`.
  1. **A policy `tarefas_importacao`** (`for all using (true) with check (true)`, do chamado #412) continuava ativa. Policies permissivas se somam por **OR**, então ela anulava a de leitura e liberava ler, criar, alterar e apagar qualquer tarefa.
  2. **A policy de leitura** comparava só a empresa exata e ignorava a árvore.
  3. **A tabela `empresas` aceitava escrita** da pessoa logada. Era possível fazer `update empresas set pai_id = 3 where id = 5` e "adotar" outra empresa.
  - **Correção:**
    - função `empresas_visiveis()` (CTE recursiva, que não trava se houver ciclo);
    - uma policy com `using` + `with check` para as quatro operações;
    - remoção da policy de importação, porque a carga roda como dono do banco;
    - RLS só de leitura em `empresas`.
  - Tabelas e colunas não mudaram.
- **Como provei que funciona:**
  - **Testes com o banco real (PGlite):** commitados antes da correção, quando 10 de 11 falhavam. Agora 26/26.
  - **Matriz de leitura:** Grupo 13 tarefas, Serviços 9, Vértice 4, Campo 4, Outra Empresa 2. Antes, todos viam 15.
  - **SELECT, UPDATE, INSERT e DELETE** testados em dois cenários: Vértice → Aurora Campo (ramos diferentes) e Aurora Campo → Aurora Serviços (de baixo para cima). Nenhum passou.
  - **Alterar a árvore:** tentativa recusada.
  - **Árvore com ciclo:** não trava.
  - **`npm run db`:** as mesmas verificações, à mão.
- **PR:** [#1](https://github.com/r-acosta-net/prova-desenvolvedor/pull/1)

## Tarefa 4 — Prazo em dias úteis

- **Situação:** pronta.
- **Qual API de feriados usei e por quê:** **BrasilAPI** (`https://brasilapi.com.br/api/feriados/v1/{ano}`).
  - **Por que ela:** é pública, brasileira e não pede token. Segue a lei (o 20/11 aparece só a partir de 2024) e calcula os feriados móveis de 1900 a 2199.
  - **Como comparei:** consultei as alternativas. A Nager.Date não é brasileira e mistura feriado estadual. A Invertexto exige token (respondeu `401`).
  - ⚠️ **Precisa de decisão da empresa:** a BrasilAPI marca **Carnaval e Corpus Christi** como nacionais, mas **na esfera federal são ponto facultativo**. Segui a API (esses dias não contam no prazo) e deixei o aviso no código, na legenda da tela e na PR. Exemplo do impacto: 13/02 + 1 dia útil = 18/02, ou 16/02 se Carnaval for dia útil.
- **Qual era o problema:**
  - `prazoSLA` somava dias corridos (sexta + 1 = sábado) e ignorava o parâmetro `feriados`.
  - **Bug adormecido:** a função misturava data em UTC com soma no horário local. No fuso de São Paulo, 02/11/2018 + 3 dava 04/11, perdendo um dia na entrada do horário de verão.
- **O que foi feito:**
  - `prazoSLA` em dias úteis, com contas só em UTC. 0 dias devolve a data de criação. Se faltarem os feriados de um ano, dá erro em vez de um prazo errado em silêncio.
  - `npm run feriados -- <ano>`: valida o ano e a resposta da API, e uma falha nunca sobrescreve o arquivo existente.
  - **`data/feriados-2026.json` e `data/feriados-2027.json` versionados.** O 2027 entra porque prazos do fim de 2026 atravessam o ano.
  - **Tela:**
    - colunas **Início do SLA, Final do SLA e SLA restante**;
    - farol com cor e texto:

      | Farol | Faixa |
      |---|---|
      | No prazo (verde) | 100–60% |
      | Atenção (amarelo) | 59–20% |
      | Crítico (vermelho) | 19–0% |
      | Estourado (vermelho escuro) | depois do prazo, com os dias úteis de atraso |

    - o tempo é contado em **tempo útil no horário de Brasília**: dia útil = 24 h, e fim de semana e feriado não consomem prazo;
    - tarefa concluída mostra "Concluída", sem farol.
- **Como provei que funciona:**
  - **Testes:** antes do código em todas as etapas. Agora 91/91 em 5 fusos reais.
  - **Limites exatos do farol:** 60,0% fica verde, 59,9% fica amarelo, e o mesmo vale para 20%.
  - **O comando:** testado contra uma API falsa local, com sucesso, 404, 500, HTML, lista vazia, demora e API fora do ar.
  - **Prazos de 3 dias úteis:** 9 das 15 tarefas mudam. Exemplos: a 114 vai de 11/10 (domingo) para 14/10, pulando o 12/10; a 108 vai de 03/10 (sábado) para 05/10.
  - **Na tela:** com o relógio real e com o relógio simulado só no navegador, aparecem as 4 cores.
- **PR:** [#5](https://github.com/r-acosta-net/prova-desenvolvedor/pull/5)

## Tarefa 5 — Exportar para o Excel

- **Situação:** pronta.
- **Qual era o problema:** medido no **Excel real** desta máquina, por automação.
  1. **Separador `,`.** O Excel em português separa colunas por `;`, então tudo caía numa coluna só.
  2. **Sem BOM UTF-8.** O Excel lia o arquivo como Windows-1252 (`manutenÃ§Ã£o`).
  3. **Nenhum escape.** A tarefa 112 (`Treinamento "Vendas 2026"; turma 1`) partia em duas colunas.
  4. **Data em ISO.** O pedido era `DD/MM/AAAA`.
  - **Além do pedido: injeção de fórmula.** A tarefa 114 (`=SOMA(...)`) virava fórmula no Excel, **mesmo entre aspas**. Agora sai como texto com `'` na frente (recomendação OWASP).
  - **Correção:**
    - BOM, `;`, `\r\n`;
    - campos entre aspas com `""`;
    - data montada pelo texto (sem `Date`, que num fuso negativo volta um dia).
  - **Botão "Exportar CSV":**
    - baixa exatamente a lista mostrada;
    - fica desabilitado quando a lista está vazia;
    - mostra um **aviso de status**: "Download iniciado" ou a falha com o motivo.
- **Como provei que funciona:**
  - **Testes:** commitados antes da correção, quando 45 de 46 falhavam. Agora 49/49.
  - **"Seja qual for o título":** 24 títulos adversariais, lidos de volta com um leitor RFC 4180, saem com exatamente 4 colunas.
  - **No Excel real:**

    | | Antes | Depois |
    |---|---|---|
    | Linhas com 4 colunas | 0 de 16 | **16 de 16** |
    | Acentos | quebrados | certos |
    | Tarefa 114 (`=SOMA`) | vira fórmula (`#NAME?`) quando as colunas são separadas | **texto** (`'=SOMA…`), 0 fórmulas |

  - **Download no navegador:** testado também manualmente.
  - **Bug achado no caminho e corrigido:** a URL do arquivo era liberada antes de o navegador ler o arquivo, e o download falhava com `ERR_FILE_NOT_FOUND`.
- **PR:** [#4](https://github.com/r-acosta-net/prova-desenvolvedor/pull/4)

## Encontrei também

**Segurança e dados**
- **`app.empresa_id` vaza entre requisições.** O valor é gravado com `set_config(..., false)`, que vale para a sessão inteira. Com pool de conexões no servidor, o contexto de uma empresa pode passar para a próxima requisição. O correto é `set_config(..., true)` dentro de uma transação.
- **`app.empresa_id` pode ser alterado pelo próprio usuário** com `set_config`. Isso é aceitável só porque o usuário não executa SQL direto.
- **A tabela `empresas` é legível por todos**, então os nomes de todos os clientes ficam visíveis.
- **A tela entrega todos os dados ao navegador.** `src/App.jsx` importa o `data/tarefas.json` inteiro, então as tarefas de todas as empresas, inclusive da Outra Empresa S.A., chegam ao navegador. Filtrar na tela é conveniência, não segurança.
- **O seletor lista todas as empresas**, inclusive a de fora do grupo.
- **A regra da árvore existe em dois lugares:** em JS na tela e em SQL no banco. O ideal é a tela receber os dados já filtrados pelo servidor.

**Vendas: sincronização (`data/vendas.json`)**

A sincronização grava vendas repetidas. As linhas repetidas são **idênticas**, o que indica janela incremental sobreposta, nova tentativa ou paginação por offset, e não atualização da venda. O código da sincronização não está no repositório, então isto fica como recomendação:

| Opção | Status |
|---|---|
| **A. Gravação idempotente**: upsert por `id` (`insert ... on conflict (id) do update`) | recomendada |
| **C. Validação de contrato no fim do job**: ids únicos; falhar e alertar, ou publicar sem duplicatas registrando quantas | recomendada |
| **E. Defesa no consumidor**: cada id conta uma vez | **já feita na PR #3** |
| **D. Origem enviar `atualizada_em`** | recomendada, para resolver conflito de status (por exemplo `paga` → `cancelada`) por critério, e não pela ordem no arquivo |

**Tela e exportação**
- **CSV continua sujeito às conversões automáticas do Excel.** Um título `1/2` pode virar data, e `00123` perde os zeros à esquerda. A solução definitiva seria exportar `.xlsx` (SheetJS ou exceljs).
- **Datas `DD/MM/AAAA`** são lidas certo no Excel em português. Num Excel em inglês, dia e mês se invertem (medido nesta máquina).
- **As tarefas não têm data de conclusão** (`concluida_em`), então não dá para saber se as concluídas cumpriram o SLA.

**Ferramentas**
- **`npm run db` com erro** despeja o código minificado do PGlite antes da mensagem.

**Processo**
- **`npm install` altera o `package-lock.json`** nesta versão do npm (remove `"peer": true`). Descartei a alteração em vez de commitar.
- **A variável `TZ` não chegava ao Node** no shell (Git Bash) que eu usava. Por isso, os testes "em outro fuso" das Tarefas 2 e 5 tinham rodado, na verdade, no fuso da máquina. Refiz tudo pelo PowerShell, em 5 fusos reais, e registrei a correção nos comentários das PRs [#3](https://github.com/r-acosta-net/prova-desenvolvedor/pull/3#issuecomment-6186535247) e [#4](https://github.com/r-acosta-net/prova-desenvolvedor/pull/4#issuecomment-6186535549).

## Perguntas para o negócio (não respondidas, assumi o mais seguro)

1. **Carnaval e Corpus Christi** contam como dia útil no SLA? Na esfera federal são ponto facultativo. Assumi que **não** contam, seguindo a BrasilAPI.
2. **Uma venda que aparece com status diferente** (por exemplo, `paga` e depois `cancelada`): qual registro vale? Assumi a **última ocorrência**.

## O que ficou faltando / o que eu faria com mais tempo

- **Tarefa concluída:** gravar `concluida_em` e mostrar no farol se foi entregue no prazo ou atrasada.
- **Feriados do próximo ano:** gerar o arquivo automaticamente, no build ou num agendamento. Hoje alguém precisa lembrar de rodar `npm run feriados -- <ano>`. Enquanto ninguém rodar, a tela mostra "—" com o motivo, e não um prazo errado.
- **Feriados estaduais e municipais,** se o contrato for por cidade. O pedido era só de feriados nacionais.
- **Validação de data duplicada:** `validarDia` (Tarefa 2) e a validação de `prazoSLA` (Tarefa 4) fazem o mesmo, porque as branches saem da `main` separadas. Depois do merge, juntaria as duas.
- **Exportação `.xlsx`** como alternativa ao CSV.
- **CI** (GitHub Actions) rodando `npm test` em mais de um fuso a cada PR. Teria evitado o problema da variável `TZ`.
- **Teste de tela automatizado** (por exemplo, Playwright) para o botão de exportar e o farol. Hoje essas partes foram verificadas no navegador, à mão e por script.
