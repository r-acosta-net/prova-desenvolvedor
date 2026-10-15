// Leitor de CSV conforme a RFC 4180 (campos entre aspas, "" = aspas, quebras
// de linha dentro de aspas), usado só nos testes para conferir o que o Excel
// vai encontrar. Ignora o BOM inicial e a quebra de linha final.
export function lerCSV(texto, separador = ';') {
  const s = texto.replace(/^﻿/, '');
  const linhas = [];
  let linha = [];
  let campo = '';
  let entreAspas = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (entreAspas) {
      if (c === '"' && s[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreAspas = false;
      else campo += c;
    } else if (c === '"' && campo === '') {
      entreAspas = true;
    } else if (c === separador) {
      linha.push(campo); campo = '';
    } else if (c === '\r' && s[i + 1] === '\n') {
      linha.push(campo); linhas.push(linha); linha = []; campo = ''; i++;
    } else {
      campo += c;
    }
  }
  if (entreAspas) throw new Error('CSV inválido: aspas abertas e não fechadas');
  if (campo !== '' || linha.length > 0) { linha.push(campo); linhas.push(linha); }
  return linhas;
}
