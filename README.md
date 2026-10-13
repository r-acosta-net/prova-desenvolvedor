# Prova prática — Desenvolvedor(a)

Olá! Esta prova simula um dia normal de trabalho com a gente: **várias frentes
ao mesmo tempo**, em partes diferentes de um sistema, com pouca instrução e
muita coisa para investigar.

- ⏱️ **Tempo estimado:** de 3 a 4 horas de trabalho. Você tem **48 horas** a
  partir do recebimento do link para entregar e pode fazer no horário que quiser.
- 🤖 **IA liberada:** use o Claude Code (ou outra ferramenta) à vontade. É assim
  que trabalhamos. O que avaliamos é **como você conduz o trabalho**, não se
  você digitou cada linha.
- ❓ **Dúvidas:** pode mandar pelo WhatsApp de quem te enviou o link. Perguntar
  bem também conta ponto.

---

## 1. Preparar

1. Clique em **"Use this template" → "Create a new repository"** (no topo desta
   página). Crie o repositório **público** na sua conta do GitHub.
2. Clone o **seu** repositório e instale as dependências (Node 20 ou mais novo):

   ```bash
   npm install
   npm test            # testes que já existem
   npm run dev         # abre a tela de tarefas no navegador
   npm run relatorio -- 2026-10-01
   npm run db -- 3 "select id, empresa_id, titulo from tarefas"
   ```

## 2. O contexto

Somos um grupo de empresas organizado em **árvore**:

```
Grupo Aurora (1)
├── Aurora Serviços (2)
│   └── Aurora Campo (4)
└── Vértice Finanças (3)
Outra Empresa S.A. (5)      ← cliente independente, fora do grupo
```

**Regra do negócio:** quem escolhe (ou pertence a) uma empresa vê os dados
**dela e de todas as empresas abaixo dela**. Quem escolhe o Grupo Aurora vê
tudo do grupo. Quem escolhe a Aurora Serviços vê Aurora Serviços e Aurora Campo. Ninguém do grupo
vê a Outra Empresa S.A., e ela não vê ninguém do grupo.

## 3. As tarefas

Chegaram cinco pedidos ao mesmo tempo. **Cabe a você decidir a ordem.**

### 🟥 Tarefa 3 — URGENTE: cliente vendo dado de outra empresa

> "Sou da Vértice Finanças e estou vendo tarefas da Aurora Serviços e de uma tal de Outra
> Empresa S.A. na minha lista. Isso é grave!"

O acesso ao banco está em `sql/schema.sql`. Com `npm run db -- <empresa_id> "<sql>"`
você consulta o banco **como uma pessoa logada naquela empresa**.

Corrija para que cada pessoa veja, altere e crie tarefas **só da empresa dela e
das empresas abaixo** (regra do contexto). Mantenha as tabelas e as colunas
como estão.

### 🟨 Tarefa 1 — "A tela de tarefas está vazia"

> "Quando escolho o Grupo Aurora na tela, não aparece nada. E acho que
> tarefa criada no último dia do filtro também some."

A tela está em `src/App.jsx` e a lógica em `src/tarefas.js`. O filtro de período
deve incluir **os dois dias das pontas** (de **e** até). Mantenha o nome e os
parâmetros da função `listarTarefas`.

### 🟦 Tarefa 2 — "O relatório de vendas está errado"

> "O relatório de 01/10/2026 diz **R$ 4.501,00**. O financeiro conferiu venda
> por venda e o certo é **R$ 3.400,50**."

O relatório roda com `npm run relatorio -- 2026-10-01`. Os dias do relatório
são no **horário de Brasília**. O arquivo `data/vendas.json` vem de uma
sincronização automática e **é substituído todo dia: não edite os dados,
corrija o código**. Mantenha os nomes e os parâmetros das funções de
`src/relatorio.js`.

### 🟩 Tarefa 4 — Prazo em dias úteis

> "O cliente contratou atendimento em **dias úteis**, mas o sistema conta dias
> corridos. Tarefa criada na sexta com prazo de 1 dia está vencendo no sábado."

A função está em `src/prazo.js`. Regras:

- o prazo começa a contar no **dia seguinte** à criação;
- dia útil é de segunda a sexta, **exceto feriados nacionais**;
- os feriados vêm da internet, de uma **API pública brasileira de feriados**.
  Pesquise qual usar. Não digite as datas à mão.

Crie o comando `npm run feriados -- 2026`, que baixa os feriados nacionais do
ano e salva em `data/feriados-2026.json`, e faça commit desse arquivo. Mostre o
prazo de cada tarefa numa coluna nova da tela, com 3 dias úteis de SLA.
Mantenha o nome e os parâmetros de `prazoSLA`.

### 🟪 Tarefa 5 — Exportar para o Excel

> "Preciso baixar as tarefas da tela para uma planilha. Testei o CSV que existe
> e no Excel ficou tudo numa coluna só, com os acentos estranhos."

A função está em `src/exportar.js`. Formato que o financeiro pediu:

- separador `;` (padrão do Excel em português);
- primeira linha: `id;titulo;status;criada_em`;
- datas no formato `DD/MM/AAAA`;
- tem que abrir no Excel com os acentos certos e **cada campo na sua coluna,
  seja qual for o título da tarefa**.

Coloque um botão **"Exportar CSV"** na tela que baixa as tarefas que estão
sendo mostradas. Mantenha o nome e os parâmetros de `gerarCSV`.

## 4. Como entregar

1. **Uma branch por tarefa**, com estes nomes exatos: `tarefa-1`, `tarefa-2`,
   `tarefa-3`, `tarefa-4` e `tarefa-5`, todas saindo da `main`.
2. **Uma Pull Request por tarefa**, de cada branch para a `main` do **seu**
   repositório. Deixe as PRs **abertas, sem fazer merge**. Na descrição da PR,
   explique o problema, a correção e **como você provou que funciona**.
3. Na `main`, preencha o **`STATUS.md`** e faça commit.
4. Na `main`, salve na pasta **`sessoes/`** o histórico das suas conversas com a
   IA. No Claude Code, use o comando `/export` em cada sessão e salve o arquivo
   ali. Se usou outra ferramenta, exporte ou cole o histórico em `.md`.
5. Mande o **link do seu repositório** pelo WhatsApp.

## 5. O que avaliamos

- se as correções funcionam de verdade, inclusive em casos que não estão nos
  testes que já existem;
- se você **provou** o que diz (testes, números, comparação);
- organização: branches, PRs e status claros;
- investigação: encontrar a causa, não só o sintoma;
- olhar além do pedido: se viu outro problema, conte no `STATUS.md`;
- honestidade sobre o que não conseguiu terminar.

Boa prova! 🚀
