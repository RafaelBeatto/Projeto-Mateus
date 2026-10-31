import type { Empresa } from 'src/types/empresas';
import type { GestaoProjeto, StatusEtapa, StatusTarefaEtapa } from 'src/types/gestaoProjetos';
import type { Prioridade } from 'src/types/comum';
import { novoId, paraIso, tabela, valor } from './banco';
import { historico, UNIDADE_LOCAL_ID, unidades, USUARIO_LOCAL_ID, usuarios } from './nucleo';

/**
 * Dados fictícios do modo local, para ver as telas preenchidas.
 * Entram uma única vez por navegador (marca "_ficticios"); para começar de novo,
 * limpe o localStorage do site.
 */

/** Data (aaaa-mm-dd) a n dias de hoje. */
const dia = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return paraIso(d);
};

/** Instante a n dias (e h horas) atrás. */
const atras = (n: number, h = 0) => new Date(Date.now() - (n * 24 + h) * 3_600_000).toISOString();

interface TarefaFicticia {
  texto: string;
  status?: StatusTarefaEtapa;
  prazo?: number;
  responsavel?: number;
}

interface EtapaFicticia {
  titulo: string;
  descricao?: string;
  status: StatusEtapa;
  responsavel?: number;
  prazo?: number;
  tarefas?: TarefaFicticia[];
  /** Posição (na lista do projeto) da etapa de onde esta ramificação sai. */
  pai?: number;
}

export function semearFicticios() {
  if (valor.ler('_ficticios', false)) return;
  valor.gravar('_ficticios', true);

  // ---------- unidade ----------
  const unidade = unidades.buscar(UNIDADE_LOCAL_ID);
  if (unidade && !unidade.cnpj) {
    unidades.salvar({
      ...unidade,
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua das Flores, 120 — Centro',
      telefone: '(11) 3456-7890',
      email: 'contato@apae-exemplo.org.br',
      cidadeUf: 'São Paulo/SP',
      site: 'www.apae-exemplo.org.br',
      presidente: 'Helena Martins',
      cpfPresidente: '123.456.789-00',
    });
  }

  // ---------- usuários ----------
  const usuario = (login: string, nome: string, funcao: string, cargoId: number, ultimoAcesso: string | null, ativo = true) =>
    usuarios.inserir({ login, nome, funcao, cargoId, unidadeId: UNIDADE_LOCAL_ID, ativo, trocarSenha: false, ultimoAcessoEm: ultimoAcesso, criadoEm: atras(70) }).id;

  const ana = usuario('ana.souza', 'Ana Souza', 'Diretora administrativa', 4, atras(0, 2));
  const carlos = usuario('carlos.lima', 'Carlos Lima', 'Coordenador de projetos', 3, atras(1));
  const beatriz = usuario('beatriz.rocha', 'Beatriz Rocha', 'Coordenadora pedagógica', 3, atras(3));
  const joao = usuario('joao.pereira', 'João Pereira', 'Assistente financeiro', 5, atras(0, 5));
  const marina = usuario('marina.alves', 'Marina Alves', 'Secretária', 5, null);
  usuario('paulo.mendes', 'Paulo Mendes', 'Contador (terceirizado)', 6, atras(20), false);

  const nomes: Record<number, string> = {
    [USUARIO_LOCAL_ID]: 'Usuário Local',
    [ana]: 'Ana Souza',
    [carlos]: 'Carlos Lima',
    [beatriz]: 'Beatriz Rocha',
    [joao]: 'João Pereira',
    [marina]: 'Marina Alves',
  };
  const registrar = (usuarioId: number, modulo: string, acao: string, descricao: string, refTipo: string, refId: number, criadoEm: string) =>
    historico.inserir({ modulo, acao, descricao, refTipo, refId, usuarioNome: nomes[usuarioId] ?? null, criadoEm });

  ['Ana Souza', 'Carlos Lima', 'Beatriz Rocha', 'João Pereira', 'Marina Alves', 'Paulo Mendes'].forEach((nome, i) =>
    historico.inserir({ modulo: 'USUARIOS', acao: 'CRIACAO', descricao: `Usuário "${nome}" criado.`, refTipo: 'USUARIO', refId: null, usuarioNome: 'Usuário Local', criadoEm: atras(70, i) }),
  );

  // ---------- empresas ----------
  const empresas = tabela<Empresa>('empresas');
  const listaEmpresas: Omit<Empresa, 'id' | 'criadoEm' | 'atualizadoEm'>[] = [
    { razaoSocial: 'Secretaria Estadual de Saúde de São Paulo', nomeFantasia: 'SES-SP', cnpj: '46.374.500/0001-94', telefone: '(11) 3066-8000', email: 'convenios@saude.sp.gov.br', endereco: 'Av. Dr. Enéas de Carvalho Aguiar, 188', municipio: 'São Paulo', uf: 'SP', representante: 'Dr. Ricardo Almeida' },
    { razaoSocial: 'Ministério da Saúde', nomeFantasia: 'Fundo Nacional de Saúde', cnpj: '00.530.493/0001-71', telefone: '(61) 3315-2425', email: 'propostas@fns.gov.br', endereco: 'Esplanada dos Ministérios, Bloco G', municipio: 'Brasília', uf: 'DF', representante: 'Mariana Costa' },
    { razaoSocial: 'Prefeitura Municipal de São Paulo', nomeFantasia: 'Secretaria Municipal de Cultura', cnpj: '46.395.000/0001-39', telefone: '(11) 3397-0000', email: 'fomento@prefeitura.sp.gov.br', endereco: 'Viaduto do Chá, 15', municipio: 'São Paulo', uf: 'SP', representante: 'Luiz Carvalho' },
    { razaoSocial: 'Secretaria Estadual de Educação de São Paulo', nomeFantasia: 'SEDUC-SP', cnpj: '46.384.111/0001-40', telefone: '(11) 2075-4000', email: 'parcerias@educacao.sp.gov.br', endereco: 'Praça da República, 53', municipio: 'São Paulo', uf: 'SP', representante: 'Fernanda Dias' },
    { razaoSocial: 'Instituto Verde Vida', nomeFantasia: 'Verde Vida', cnpj: '12.987.654/0001-21', telefone: '(19) 3344-5566', email: 'contato@verdevida.org.br', endereco: 'Rua das Palmeiras, 300', municipio: 'Campinas', uf: 'SP', representante: 'Cláudia Ramos' },
    { razaoSocial: 'Fundação Banco Solidário', nomeFantasia: 'Banco Solidário', cnpj: '33.111.222/0001-55', telefone: '(11) 4004-1234', email: 'editais@bancosolidario.org.br', endereco: 'Av. Paulista, 2000', municipio: 'São Paulo', uf: 'SP', representante: 'Marcos Teixeira' },
    { razaoSocial: 'Rotary Club São Paulo Centro', nomeFantasia: 'Rotary Centro', cnpj: '44.222.333/0001-66', telefone: '(11) 3222-1100', email: null, endereco: 'Rua Líbero Badaró, 425', municipio: 'São Paulo', uf: 'SP', representante: 'Antônio Moura' },
  ];
  listaEmpresas.forEach((dados, i) => {
    const criadoEm = atras(5 * (i + 1));
    const e = empresas.inserir({ ...dados, criadoEm, atualizadoEm: criadoEm });
    registrar(joao, 'EMPRESAS', 'CRIACAO', `Contratante "${e.razaoSocial}" cadastrado.`, 'EMPRESA', e.id, criadoEm);
  });

  // ---------- gestão de projetos ----------
  type ProjetoLocal = Omit<GestaoProjeto, 'id' | 'coordenadores' | 'etapasTotal' | 'etapasConcluidas'> & { coordenadores: number[] };
  const projetos = tabela<ProjetoLocal & { id: number }>('gestaoProjetos');
  const etapas = tabela<{ id: number } & Record<string, unknown>>('gestaoProjetoEtapas');
  const mensagens = tabela<{ id: number; projetoId: number; remetenteId: number; texto: string; enviadaEm: string }>('gestaoProjetoMensagens');

  const projeto = (
    criadoPor: number,
    criadoHa: number,
    p: Partial<ProjetoLocal> & { nome: string; status: ProjetoLocal['status']; dataInicio: string },
    etapasDoProjeto: EtapaFicticia[] = [],
  ) => {
    const criadoEm = atras(criadoHa);
    const novo = projetos.inserir({
      processo: null,
      contratante: null,
      contratanteCidade: null,
      prioridade: null,
      dataFim: null,
      coordenadores: [],
      convenioOrigem: null,
      convenioNumero: null,
      valorConvenio: null,
      contrapartida: null,
      origemRecurso: null,
      arquivadoEm: null,
      excluidoEm: null,
      criadoEm,
      atualizadoEm: criadoEm,
      ...p,
    });
    registrar(criadoPor, 'GESTAO_PROJETOS', 'CRIACAO', `Projeto "${novo.nome}" criado.`, 'GESTAO_PROJETO', novo.id, criadoEm);
    const tarefaIds: number[] = [];
    const etapaIds: number[] = [];
    etapasDoProjeto.forEach((e, i) => {
      const tarefas = (e.tarefas ?? []).map((t) => {
        const status = t.status ?? 'EM_ESPERA';
        const id = novoId();
        tarefaIds.push(id);
        return {
          id,
          texto: t.texto,
          feita: status === 'CONCLUIDA',
          status,
          prazo: t.prazo === undefined ? null : dia(t.prazo),
          responsavelId: t.responsavel ?? null,
          dependencias: [] as number[],
          dependenciasEtapas: [] as number[],
        };
      });
      const em = atras(criadoHa - i);
      const etapa = etapas.inserir({
        projetoId: novo.id,
        etapaPaiId: e.pai === undefined ? null : etapaIds[e.pai],
        titulo: e.titulo,
        descricao: e.descricao ?? null,
        status: e.status,
        responsavelId: e.responsavel ?? null,
        prazo: e.prazo === undefined ? null : dia(e.prazo),
        tarefas,
        criadoEm: em,
        atualizadoEm: em,
      });
      etapaIds.push(etapa.id);
    });
    return { id: novo.id, nome: novo.nome, tarefaIds };
  };

  const prio = (p: Prioridade) => p;

  // 1. Em andamento, com etapas, tarefas, dependência e chat
  const fisio = projeto(
    carlos,
    60,
    {
      nome: 'Reforma da Sala de Fisioterapia',
      processo: '2026/0142',
      contratante: 'Secretaria Estadual de Saúde de São Paulo',
      contratanteCidade: 'São Paulo/SP',
      status: 'EM_ANDAMENTO',
      prioridade: prio('ALTA'),
      dataInicio: dia(-60),
      dataFim: dia(45),
      coordenadores: [carlos, ana],
      convenioOrigem: 'Governo do Estado de SP',
      convenioNumero: 'CV-0421/2026',
      valorConvenio: 185000,
      contrapartida: 18500,
      origemRecurso: 'Emenda parlamentar estadual',
    },
    [
      {
        titulo: 'Levantamento e orçamento',
        descricao: 'Medição da sala e três orçamentos de empresas.',
        status: 'CONCLUIDO',
        responsavel: carlos,
        prazo: -30,
        tarefas: [
          { texto: 'Medir a sala e fotografar', status: 'CONCLUIDA', prazo: -50, responsavel: carlos },
          { texto: 'Pedir 3 orçamentos', status: 'CONCLUIDA', prazo: -40, responsavel: joao },
          { texto: 'Aprovar orçamento na diretoria', status: 'CONCLUIDA', prazo: -32, responsavel: ana },
        ],
      },
      {
        titulo: 'Obra',
        descricao: 'Piso, iluminação, pintura e adaptação dos banheiros.',
        status: 'EM_ANDAMENTO',
        responsavel: carlos,
        prazo: 20,
        tarefas: [
          { texto: 'Trocar o piso por vinílico antiderrapante', status: 'CONCLUIDA', prazo: -5, responsavel: carlos },
          { texto: 'Instalar barras de apoio', status: 'EM_ANDAMENTO', prazo: 7, responsavel: carlos },
          { texto: 'Vistoria final da obra', prazo: 18, responsavel: ana },
        ],
      },
      {
        titulo: 'Prestação de contas',
        status: 'EM_ESPERA',
        responsavel: joao,
        prazo: 45,
        tarefas: [
          { texto: 'Juntar notas fiscais', prazo: 30, responsavel: joao },
          { texto: 'Enviar relatório ao órgão', prazo: 45, responsavel: joao },
        ],
      },
      // Ramificações (saem de outras etapas no mapa).
      {
        titulo: 'Elétrica',
        status: 'EM_ANDAMENTO',
        responsavel: carlos,
        prazo: 12,
        pai: 1,
        tarefas: [
          { texto: 'Trocar luminárias por LED', status: 'CONCLUIDA', responsavel: carlos },
          { texto: 'Tomadas novas para os aparelhos', status: 'EM_ANDAMENTO', prazo: 6, responsavel: carlos },
        ],
      },
      {
        titulo: 'Banheiro adaptado',
        status: 'EM_PAUSA',
        responsavel: carlos,
        prazo: 25,
        pai: 1,
        tarefas: [{ texto: 'Instalar vaso e pia acessíveis', status: 'EM_PAUSA', prazo: 22, responsavel: carlos }],
      },
      {
        titulo: 'Compra de equipamentos',
        status: 'EM_ESPERA',
        responsavel: joao,
        prazo: 15,
        pai: 0,
        tarefas: [
          { texto: 'Esteira ergométrica', prazo: 15, responsavel: joao },
          { texto: 'Barras paralelas', prazo: 15, responsavel: joao },
        ],
      },
    ],
  );
  // "Vistoria final" depende de "Instalar barras de apoio".
  const [, , , , barras, vistoria] = fisio.tarefaIds;
  etapas
    .filtrar((e) => e.projetoId === fisio.id)
    .forEach((e) => {
      const tarefas = (e.tarefas as { id: number; dependencias: number[] }[]).map((t) => (t.id === vistoria ? { ...t, dependencias: [barras] } : t));
      etapas.salvar({ ...e, tarefas });
    });
  registrar(carlos, 'GESTAO_PROJETOS', 'CONCLUSAO', 'Etapa "Levantamento e orçamento" movida para Concluído.', 'GESTAO_PROJETO', fisio.id, atras(30));
  [
    [carlos, 'Pessoal, a empresa começa o piso na segunda.', atras(12)],
    [ana, 'Ótimo! Avisem as famílias que a fisioterapia muda de sala nessas duas semanas.', atras(12, -1)],
    [joao, 'Já separei a primeira nota fiscal para a prestação de contas.', atras(4)],
    [carlos, 'Piso pronto. Barras de apoio chegam quinta.', atras(1)],
  ].forEach(([remetenteId, texto, enviadaEm]) =>
    mensagens.inserir({ projetoId: fisio.id, remetenteId: remetenteId as number, texto: texto as string, enviadaEm: enviadaEm as string }),
  );

  // 2. Em espera
  projeto(
    ana,
    8,
    {
      nome: 'Compra de Van Adaptada',
      processo: '2026/0177',
      contratante: 'Ministério da Saúde',
      contratanteCidade: 'Brasília/DF',
      status: 'EM_ESPERA',
      prioridade: 'URGENTE',
      dataInicio: dia(10),
      coordenadores: [ana],
      convenioOrigem: 'Fundo Nacional de Saúde',
      valorConvenio: 320000,
      origemRecurso: 'Proposta de emenda federal',
    },
    [
      {
        titulo: 'Documentação da proposta',
        status: 'EM_ANDAMENTO',
        responsavel: marina,
        prazo: 5,
        tarefas: [
          { texto: 'Certidão negativa de débitos federais', status: 'CONCLUIDA', prazo: -1, responsavel: marina },
          { texto: 'Ata de eleição da diretoria', status: 'EM_ANDAMENTO', prazo: 2, responsavel: marina },
          { texto: 'Plano de trabalho assinado', prazo: 5, responsavel: ana },
        ],
      },
    ],
  );

  // 3. Em análise
  const musica = projeto(
    beatriz,
    120,
    {
      nome: 'Oficina de Música Inclusiva',
      processo: '2026/0098',
      contratante: 'Prefeitura Municipal de São Paulo',
      contratanteCidade: 'São Paulo/SP',
      status: 'EM_ANALISE',
      prioridade: 'MEDIA',
      dataInicio: dia(-120),
      dataFim: dia(-5),
      coordenadores: [beatriz],
      convenioOrigem: 'Secretaria Municipal de Cultura',
      convenioNumero: 'TF-118/2026',
      valorConvenio: 48000,
      contrapartida: 4800,
    },
    [
      {
        titulo: 'Aulas do semestre',
        status: 'CONCLUIDO',
        responsavel: beatriz,
        prazo: -10,
        tarefas: [
          { texto: 'Comprar instrumentos', status: 'CONCLUIDA' },
          { texto: 'Contratar professor de musicoterapia', status: 'CONCLUIDA' },
          { texto: 'Apresentação de encerramento', status: 'CONCLUIDA' },
        ],
      },
      {
        titulo: 'Relatório final',
        status: 'EM_ANDAMENTO',
        responsavel: beatriz,
        prazo: 10,
        tarefas: [
          { texto: 'Fotos e lista de presença', status: 'EM_ANDAMENTO', prazo: 3, responsavel: beatriz },
          { texto: 'Protocolar relatório na prefeitura', prazo: 10, responsavel: marina },
        ],
      },
    ],
  );
  registrar(beatriz, 'GESTAO_PROJETOS', 'MOVIMENTACAO', 'Projeto "Oficina de Música Inclusiva" movido para Em análise.', 'GESTAO_PROJETO', musica.id, atras(4));
  mensagens.inserir({ projetoId: musica.id, remetenteId: beatriz, texto: 'A prefeitura pediu mais fotos da apresentação.', enviadaEm: atras(2) });

  // 4. Em pausa
  projeto(
    carlos,
    40,
    {
      nome: 'Horta Terapêutica',
      contratante: 'Instituto Verde Vida',
      contratanteCidade: 'Campinas/SP',
      status: 'EM_PAUSA',
      prioridade: 'BAIXA',
      dataInicio: dia(-40),
      coordenadores: [carlos, beatriz],
      valorConvenio: 12000,
      origemRecurso: 'Doação de instituto parceiro',
    },
    [{ titulo: 'Preparar canteiros', descricao: 'Parado até o fim do período de chuvas.', status: 'EM_PAUSA', responsavel: carlos }],
  );

  // 5 a 7. Mais alguns no Kanban
  projeto(ana, 3, { nome: 'Campanha de Doação de Natal', status: 'EM_ESPERA', prioridade: 'MEDIA', dataInicio: dia(30), coordenadores: [ana, marina] });
  projeto(beatriz, 15, { nome: 'Capacitação de Professores em LIBRAS', status: 'EM_ANDAMENTO', dataInicio: dia(-15), coordenadores: [beatriz] }, [
    {
      titulo: 'Turma 1',
      status: 'EM_ANDAMENTO',
      responsavel: beatriz,
      prazo: 25,
      tarefas: [
        { texto: 'Reservar o auditório', status: 'CONCLUIDA', responsavel: marina },
        { texto: 'Lista de inscritos', status: 'EM_ANDAMENTO', prazo: 4, responsavel: beatriz },
      ],
    },
  ]);
  projeto(joao, 20, {
    nome: 'Equipamentos de Informática',
    processo: '2026/0201',
    contratante: 'Secretaria Estadual de Educação de São Paulo',
    contratanteCidade: 'São Paulo/SP',
    status: 'EM_ANDAMENTO',
    prioridade: 'MEDIA',
    dataInicio: dia(-20),
    dataFim: dia(70),
    coordenadores: [joao],
    convenioOrigem: 'Governo do Estado de SP',
    convenioNumero: 'CV-0533/2026',
    valorConvenio: 65000,
    contrapartida: 0,
  });

  // 8 e 9. Arquivados
  const junina = projeto(marina, 160, {
    nome: 'Festa Junina 2026',
    status: 'EM_ANALISE',
    prioridade: 'BAIXA',
    dataInicio: '2026-05-01',
    dataFim: '2026-06-28',
    coordenadores: [marina],
    arquivadoEm: atras(90),
  });
  const telhado = projeto(carlos, 400, {
    nome: 'Reforma do Telhado (Bloco A)',
    processo: '2025/0310',
    contratante: 'Prefeitura Municipal de São Paulo',
    contratanteCidade: 'São Paulo/SP',
    status: 'EM_ANALISE',
    prioridade: 'ALTA',
    dataInicio: '2025-08-01',
    dataFim: '2026-02-28',
    coordenadores: [carlos],
    valorConvenio: 98000,
    arquivadoEm: atras(200),
  });
  registrar(ana, 'GESTAO_PROJETOS', 'ARQUIVAMENTO', `Projeto "${junina.nome}" arquivado.`, 'GESTAO_PROJETO', junina.id, atras(90));
  registrar(ana, 'GESTAO_PROJETOS', 'ARQUIVAMENTO', `Projeto "${telhado.nome}" arquivado.`, 'GESTAO_PROJETO', telhado.id, atras(200));

  // 10. Na lixeira
  const duplicado = projeto(marina, 10, { nome: 'Projeto teste (duplicado)', status: 'EM_ESPERA', dataInicio: dia(-10), excluidoEm: atras(6) });
  registrar(marina, 'GESTAO_PROJETOS', 'EXCLUSAO', `Projeto "${duplicado.nome}" movido para a lixeira.`, 'GESTAO_PROJETO', duplicado.id, atras(6));
}
