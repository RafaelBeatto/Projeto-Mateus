/** Contratantes (back: empresas/*). Só a razão social é obrigatória. */

export interface Empresa {
  id: number;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  representante: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

/** Mesmo CNPJ ou razão social já cadastrados devolvem o existente (jaExistia = true). */
export interface EmpresaCriada {
  empresa: Empresa;
  jaExistia: boolean;
}

export interface RequisicaoEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  municipio: string;
  uf: string;
  representante: string;
}
