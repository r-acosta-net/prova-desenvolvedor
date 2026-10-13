// Sobe o banco em memória (Postgres via PGlite) com sql/schema.sql e os dados
// de data/, e roda uma consulta COMO uma pessoa logada numa empresa.
//
// Uso:  npm run db -- <empresa_id> "<sql>"
// Ex.:  npm run db -- 3 "select id, empresa_id, titulo from tarefas"
import { montarBanco, entrarComo } from './banco.js';

const [empresaId, sql] = process.argv.slice(2);
if (!empresaId || !sql) {
  console.error('Uso: npm run db -- <empresa_id> "<sql>"');
  process.exit(1);
}

const db = await montarBanco();
await entrarComo(db, empresaId);

const r = await db.query(sql);
console.table(r.rows);
