// Uso: npm run relatorio -- 2026-10-01
import { readFileSync } from 'node:fs';
import { totalDoDia, ticketMedio, formatarBRL } from '../src/relatorio.js';

const dia = process.argv[2];
if (!dia) {
  console.error('Informe o dia: npm run relatorio -- 2026-10-01');
  process.exit(1);
}

const vendas = JSON.parse(readFileSync(new URL('../data/vendas.json', import.meta.url)));

console.log(`Relatório de vendas — ${dia}`);
console.log(`Total vendido: ${formatarBRL(totalDoDia(vendas, dia))}`);
console.log(`Ticket médio:  ${formatarBRL(ticketMedio(vendas, dia))}`);
