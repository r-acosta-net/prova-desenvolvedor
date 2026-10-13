// Isolamento entre empresas no banco (RLS de sql/schema.sql).
// Regra: quem está logado numa empresa vê, cria, altera e apaga tarefas só
// dela e das empresas abaixo dela na árvore.
import { describe, it, expect, beforeAll } from 'vitest';
import { montarBanco, entrarComo } from '../scripts/banco.js';

// Árvore: 1 Grupo Aurora > 2 Aurora Serviços > 4 Aurora Campo
//                        > 3 Vértice Finanças
//         5 Outra Empresa S.A. (fora do grupo)
const VISIVEIS = {
  1: [101, 102, 103, 104, 105, 106, 108, 109, 110, 112, 113, 114, 115],
  2: [101, 102, 103, 104, 108, 109, 112, 113, 115],
  3: [105, 106, 110, 114],
  4: [103, 104, 109, 113],
  5: [107, 111],
};

let db;
beforeAll(async () => {
  db = await montarBanco();
});

async function idsVisiveis(empresaId) {
  await entrarComo(db, empresaId);
  const r = await db.query('select id from tarefas order by id');
  return r.rows.map((t) => t.id);
}

describe('leitura', () => {
  for (const [empresaId, esperado] of Object.entries(VISIVEIS)) {
    it(`empresa ${empresaId} vê só as próprias tarefas e as das empresas abaixo`, async () => {
      expect(await idsVisiveis(empresaId)).toEqual(esperado);
    });
  }

  it('sem empresa definida não vê nada', async () => {
    await db.exec('reset role; reset app.empresa_id; set role app_user;');
    const r = await db.query('select id from tarefas');
    expect(r.rows).toEqual([]);
  });
});

describe('escrita', () => {
  it('cria tarefa na própria empresa e numa empresa abaixo', async () => {
    await entrarComo(db, 2);
    await db.query("insert into tarefas values (900, 2, 'própria', 'aberta', '2026-10-01')");
    await db.query("insert into tarefas values (901, 4, 'filha', 'aberta', '2026-10-01')");
    expect(await idsVisiveis(2)).toEqual(expect.arrayContaining([900, 901]));
  });

  it('não cria tarefa em empresa irmã, acima ou de fora do grupo', async () => {
    await entrarComo(db, 3);
    for (const outra of [1, 2, 5]) {
      await expect(
        db.query(`insert into tarefas values (${910 + outra}, ${outra}, 'x', 'aberta', '2026-10-01')`),
      ).rejects.toThrow(/row-level security/);
    }
  });

  it('não altera nem apaga tarefa de outra empresa', async () => {
    await entrarComo(db, 3);
    const upd = await db.query("update tarefas set titulo = 'invadido' where id in (101, 107)");
    const del = await db.query('delete from tarefas where id in (101, 107)');
    expect(upd.affectedRows).toBe(0);
    expect(del.affectedRows).toBe(0);

    await entrarComo(db, 1);
    const r = await db.query('select titulo from tarefas where id = 101');
    expect(r.rows[0].titulo).toBe('Revisar proposta do cliente Almeida');
  });

  it('não move a própria tarefa para uma empresa que não enxerga', async () => {
    await entrarComo(db, 3);
    await expect(
      db.query('update tarefas set empresa_id = 5 where id = 105'),
    ).rejects.toThrow(/row-level security/);
  });

  it('não muda a árvore de empresas para passar a enxergar outra', async () => {
    await entrarComo(db, 3);
    await db.query('update empresas set pai_id = 3 where id = 4').catch(() => {});
    expect(await idsVisiveis(3)).not.toContain(103);
  });

  it('não muda a árvore incluindo empresa de fora do grupo', async () => {
    await entrarComo(db, 3);
    await db.query('update empresas set pai_id = 3 where id = 5').catch(() => {});
    await db.query("insert into empresas values (99, 'Fantasma', 3)").catch(() => {});
    expect(await idsVisiveis(3)).toEqual(VISIVEIS[3]);

    await entrarComo(db, 1);
    const r = await db.query('select id, pai_id from empresas where id in (5, 99) order by id');
    expect(r.rows).toEqual([{ id: 5, pai_id: null }]);
  });
});


// Tentativas de acesso entre empresas do mesmo grupo que NÃO estão uma
// abaixo da outra. Para cada uma: SELECT, UPDATE, INSERT e DELETE devem
// falhar, e as tarefas da empresa alvo têm de continuar intactas.
function tentativaDeAcesso({ quem, alvo, novaTarefaId }) {
  describe(`${quem.nome} (${quem.id}) tentando acessar a ${alvo.nome} (${alvo.id})`, () => {
    let original;

    beforeAll(async () => {
      await entrarComo(db, alvo.id);
      original = (await db.query('select * from tarefas where empresa_id = $1 order by id', [alvo.id])).rows;
      expect(original.length).toBeGreaterThan(0);
      await entrarComo(db, quem.id);
    });

    it(`SELECT não retorna nenhuma tarefa da ${alvo.nome}`, async () => {
      const porEmpresa = await db.query('select id from tarefas where empresa_id = $1', [alvo.id]);
      const porId = await db.query('select id from tarefas where id = $1', [original[0].id]);
      expect(porEmpresa.rows).toEqual([]);
      expect(porId.rows).toEqual([]);
    });

    it(`UPDATE não altera nenhuma tarefa da ${alvo.nome}`, async () => {
      const r = await db.query(
        "update tarefas set status = 'concluida', titulo = 'invadido' where empresa_id = $1", [alvo.id]);
      expect(r.affectedRows).toBe(0);
    });

    it(`INSERT de tarefa na ${alvo.nome} é recusado`, async () => {
      await expect(
        db.query("insert into tarefas values ($1, $2, 'intrusa', 'aberta', '2026-10-01')", [novaTarefaId, alvo.id]),
      ).rejects.toThrow(/row-level security/);
    });

    it(`DELETE não apaga nenhuma tarefa da ${alvo.nome}`, async () => {
      const r = await db.query('delete from tarefas where empresa_id = $1', [alvo.id]);
      expect(r.affectedRows).toBe(0);
    });

    it(`as tarefas da ${alvo.nome} continuam intactas`, async () => {
      await entrarComo(db, alvo.id);
      const agora = await db.query('select * from tarefas where empresa_id = $1 order by id', [alvo.id]);
      expect(agora.rows).toEqual(original);
      expect((await db.query('select id from tarefas where id = $1', [novaTarefaId])).rows).toEqual([]);
    });
  });
}

const VERTICE = { id: 3, nome: 'Vértice Finanças' };
const AURORA_SERVICOS = { id: 2, nome: 'Aurora Serviços' };
const AURORA_CAMPO = { id: 4, nome: 'Aurora Campo' };

// Ramos diferentes da árvore: a Aurora Campo fica abaixo da Aurora Serviços.
tentativaDeAcesso({ quem: VERTICE, alvo: AURORA_CAMPO, novaTarefaId: 950 });

// De baixo para cima: estar abaixo de uma empresa não dá acesso a ela.
tentativaDeAcesso({ quem: AURORA_CAMPO, alvo: AURORA_SERVICOS, novaTarefaId: 951 });

describe('Aurora Campo (4) tentando subir na árvore', () => {
  const empresasVisiveis = async () =>
    (await db.query('select distinct empresa_id from tarefas order by empresa_id')).rows.map((t) => t.empresa_id);

  it('não pendura a Aurora Serviços abaixo de si alterando empresas.pai_id', async () => {
    await entrarComo(db, 4);
    await db.query('update empresas set pai_id = 4 where id = 2').catch(() => {});
    expect(await empresasVisiveis()).toEqual([4]);

    await entrarComo(db, 1);
    const r = await db.query('select pai_id from empresas where id = 2');
    expect(r.rows).toEqual([{ pai_id: 1 }]);
  });
});

describe('árvore com ciclo', () => {
  it('não trava a consulta e não vaza para fora do ciclo', async () => {
    const outro = await montarBanco();
    // só o dono do banco consegue criar o ciclo 2 → 4 → 2
    await outro.exec('update empresas set pai_id = 4 where id = 2');
    await entrarComo(outro, 4);
    const r = await outro.query('select distinct empresa_id from tarefas order by empresa_id');
    expect(r.rows.map((t) => t.empresa_id)).toEqual([2, 4]);
  });
});
