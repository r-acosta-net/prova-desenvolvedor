// Monta o banco em memória (Postgres via PGlite) com sql/schema.sql e os dados
// de data/. Usado pelo `npm run db` e pelos testes, para os dois rodarem
// exatamente o mesmo schema.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function montarBanco() {
  const db = new PGlite();
  await db.exec(ler('sql/schema.sql'));

  for (const e of JSON.parse(ler('data/empresas.json'))) {
    await db.query('insert into empresas values ($1, $2, $3)', [e.id, e.nome, e.pai_id]);
  }
  for (const t of JSON.parse(ler('data/tarefas.json'))) {
    await db.query('insert into tarefas values ($1, $2, $3, $4, $5)',
      [t.id, t.empresa_id, t.titulo, t.status, t.criada_em]);
  }

  // a pessoa logada: papel sem privilégio
  await db.exec(`
    create role app_user;
    grant select, insert, update, delete on all tables in schema public to app_user;
    grant execute on all functions in schema public to app_user;
  `);
  return db;
}

/** Passa a agir como uma pessoa logada na empresa informada. */
export async function entrarComo(db, empresaId) {
  await db.exec(`
    reset role;
    select set_config('app.empresa_id', '${Number(empresaId)}', false);
    set role app_user;
  `);
}
