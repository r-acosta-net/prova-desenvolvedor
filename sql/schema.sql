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

-- Empresas que a pessoa logada enxerga: a dela e todas abaixo dela.
-- Sem app.empresa_id definido, não enxerga nenhuma.
-- `union` (e não `union all`) encerra a recursão mesmo se a árvore tiver ciclo.
create function empresas_visiveis() returns setof int
  language sql stable
  set search_path = public, pg_catalog
as $$
  with recursive arvore(id) as (
    select id from empresas
     where id = nullif(current_setting('app.empresa_id', true), '')::int
    union
    select e.id from empresas e join arvore a on e.pai_id = a.id
  )
  select id from arvore
$$;

alter table tarefas enable row level security;

-- Vale para ler, criar, alterar e apagar. O `with check` impede criar tarefa
-- em outra empresa e mover uma tarefa para empresa que a pessoa não enxerga.
-- A importação de dados roda com o dono do banco, que não passa pelo RLS;
-- não é preciso (nem seguro) abrir uma policy para ela.
create policy tarefas_por_empresa on tarefas
  for all
  using (empresa_id in (select empresas_visiveis()))
  with check (empresa_id in (select empresas_visiveis()));

-- A árvore define quem vê o quê, então a pessoa logada só pode lê-la:
-- sem policy de insert/update/delete, essas operações não passam.
alter table empresas enable row level security;

create policy empresas_leitura on empresas
  for select
  using (true);
