import type { Empresa } from 'src/types/empresas';
import { mascaraCnpj } from 'src/utils/formatacao';
import { agora, copia, exigir, limpo, regra, tabela } from './banco';
import { historicoDo, registrar } from './nucleo';
import { del, get, post, put } from './rotas';

/** Contratantes (ServicoEmpresa). */
export const empresas = tabela<Empresa>('empresas');

const resposta = (e: Empresa) => copia(e);

const cnpj = (v: unknown) => (limpo(v) ? mascaraCnpj(String(v)) : null);

/** Mesmo CNPJ ou, senão, mesma razão social = mesmo contratante. */
function mesmaEmpresa(cnpjFormatado: string | null, razaoSocial: string, ignorarId: number | null) {
  const outras = empresas.filtrar((e) => e.id !== ignorarId);
  return (
    (cnpjFormatado ? outras.find((e) => e.cnpj === cnpjFormatado) : undefined) ??
    outras.find((e) => e.razaoSocial.toLowerCase() === razaoSocial.toLowerCase())
  );
}

function dados(b: Record<string, unknown>) {
  exigir({ razaoSocial: b.razaoSocial });
  return {
    razaoSocial: limpo(b.razaoSocial)!,
    nomeFantasia: limpo(b.nomeFantasia),
    cnpj: cnpj(b.cnpj),
    telefone: limpo(b.telefone),
    email: limpo(b.email),
    endereco: limpo(b.endereco),
    municipio: limpo(b.municipio),
    uf: limpo(b.uf)?.toUpperCase() ?? null,
    representante: limpo(b.representante),
  };
}

get('/empresas', () =>
  empresas
    .todos()
    .sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR'))
    .map(resposta),
);
get('/empresas/:id', ({ p }) => resposta(empresas.obter(p.id, 'Contratante')));
get('/empresas/:id/historico', ({ p }) => {
  empresas.obter(p.id, 'Contratante');
  return historicoDo('EMPRESA', p.id);
});

post('/empresas', ({ b }) => {
  const d = dados(b);
  const existente = mesmaEmpresa(d.cnpj, d.razaoSocial, null);
  if (existente) return { empresa: resposta(existente), jaExistia: true };
  const e = empresas.inserir({ ...d, criadoEm: agora(), atualizadoEm: agora() });
  registrar('EMPRESAS', 'CRIACAO', `Contratante "${e.razaoSocial}" cadastrado.`, 'EMPRESA', e.id);
  return { empresa: resposta(e), jaExistia: false };
});

put('/empresas/:id', ({ p, b }) => {
  const e = empresas.obter(p.id, 'Contratante');
  const d = dados(b);
  const outra = mesmaEmpresa(d.cnpj, d.razaoSocial, e.id);
  if (outra) {
    const pelo = d.cnpj && d.cnpj === outra.cnpj ? 'CNPJ' : 'nome';
    throw regra(`Já existe outro contratante cadastrado com esse ${pelo}: "${outra.razaoSocial}".`);
  }
  const atualizada = empresas.salvar({ ...e, ...d, atualizadoEm: agora() });
  registrar('EMPRESAS', 'EDICAO', `Dados do contratante "${atualizada.razaoSocial}" atualizados.`, 'EMPRESA', e.id);
  return resposta(atualizada);
});

del('/empresas/:id', ({ p }) => {
  const e = empresas.obter(p.id, 'Contratante');
  empresas.excluir(p.id);
  registrar('EMPRESAS', 'EXCLUSAO', `Contratante "${e.razaoSocial}" excluído.`, 'EMPRESA', p.id);
});
