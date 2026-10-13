// Sobe o banco em memória (Postgres via PGlite) com sql/schema.sql e os dados
// de data/, e roda uma consulta COMO uma pessoa logada numa empresa.
//
// Uso:  npm run db -- <empresa_id> "<sql>"
// Ex.:  npm run db -- 3 "select id, empresa_id, titulo from tarefas"
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const [empresaId, sql] = process.argv.slice(2);
if (!empresaId || !sql) {
  console.error('Uso: npm run db -- <empresa_id> "<sql>"');
  process.exit(1);
}

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const db = new PGlite();
await db.exec(ler('sql/schema.sql'));

for (const e of JSON.parse(ler('data/empresas.json'))) {
  await db.query('insert into empresas values ($1, $2, $3)', [e.id, e.nome, e.pai_id]);
}
for (const t of JSON.parse(ler('data/tarefas.json'))) {
  await db.query('insert into tarefas values ($1, $2, $3, $4, $5)',
    [t.id, t.empresa_id, t.titulo, t.status, t.criada_em]);
}

// a pessoa logada: papel sem privilégio + a empresa dela
await db.exec(`
  create role app_user;
  grant select, insert, update, delete on all tables in schema public to app_user;
  grant execute on all functions in schema public to app_user;
  select set_config('app.empresa_id', '${Number(empresaId)}', false);
  set role app_user;
`);

const r = await db.query(sql);
console.table(r.rows);
