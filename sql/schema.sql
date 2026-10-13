-- Banco das tarefas. Cada pessoa logada pertence a UMA empresa, que o
-- servidor grava em app.empresa_id antes de cada consulta.
-- A pessoa vê a própria empresa e as empresas abaixo dela na árvore.

create table empresas (
  id     int primary key,
  nome   text not null,
  pai_id int references empresas(id)
);

create table tarefas (
  id         int primary key,
  empresa_id int not null references empresas(id),
  titulo     text not null,
  status     text not null default 'aberta',
  criada_em  date not null
);

alter table tarefas enable row level security;

create policy tarefas_leitura on tarefas
  for select
  using (empresa_id = current_setting('app.empresa_id', true)::int);

-- liberado para a importação inicial (chamado #412)
create policy tarefas_importacao on tarefas
  for all
  using (true)
  with check (true);
