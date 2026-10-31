import { Autocomplete, Grid, Typography } from '@mui/material';
import { useField } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { LIMITES } from 'src/constantes/limites';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoEmpresas } from 'src/servicos/empresas';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Empresa } from 'src/types/empresas';
import { Prioridade, ROTULO_PRIORIDADE } from 'src/types/comum';
import {
  Coordenador,
  GestaoProjeto,
  RequisicaoGestaoProjeto,
  ROTULO_STATUS_GESTAO_PROJETO,
} from 'src/types/gestaoProjetos';
import { PROPS_VALOR } from 'src/utils/projetos';
import { regras, Yup } from 'src/utils/validacao';

/** Valor em reais opcional: vazio vira null; se informado, não negativo e com até 2 casas. */
const valorOpcional = () =>
  Yup.number()
    .transform((v, original) => (original === '' || original === null ? null : v))
    .nullable()
    .typeError('Informe um valor')
    .min(0, 'O valor não pode ser negativo')
    .test(
      'centavos',
      'Use no máximo 2 casas decimais',
      (v) => v == null || Math.abs(Math.round(v * 100) - v * 100) < 1e-6,
    );

const esquema = Yup.object({
  nome: regras.obrigatorio(LIMITES.GESTAO_PROJETO_NOME),
  processo: regras.texto(LIMITES.GESTAO_PROJETO_PROCESSO),
  contratante: regras.texto(LIMITES.GESTAO_PROJETO_CONTRATANTE),
  dataInicio: Yup.string(),
  dataFim: Yup.string().test(
    'depois',
    'A data de término não pode ser anterior à de início.',
    (v, ctx) => !v || !ctx.parent.dataInicio || v >= ctx.parent.dataInicio,
  ),
  convenioOrigem: regras.texto(LIMITES.GESTAO_PROJETO_CONVENIO_ORIGEM),
  convenioNumero: regras.texto(LIMITES.GESTAO_PROJETO_CONVENIO_NUMERO),
  valorConvenio: valorOpcional(),
  contrapartida: valorOpcional(),
  origemRecurso: regras.texto(LIMITES.GESTAO_PROJETO_ORIGEM_RECURSO),
});

const OPCOES_PRIORIDADE = [
  { valor: '', rotulo: 'Nada' },
  ...(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => ({
    valor: p,
    rotulo: ROTULO_PRIORIDADE[p],
  })),
];

const Secao = ({ titulo }: { titulo: string }) => (
  <Grid item xs={12}>
    <Typography variant="h6" mt={3}>
      {titulo}
    </Typography>
  </Grid>
);

/** Coordenadores: usuários ativos da unidade (opcional, podem ser definidos depois). */
const CampoCoordenadores = ({ iniciais }: { iniciais: Coordenador[] }) => {
  const [campo, , ajudante] = useField<number[]>('coordenadores');
  const { dados, carregando } = useConsulta(servicoGestaoProjetos.coordenadoresDisponiveis);
  // Quem já coordena continua aparecendo mesmo se não estiver mais na lista (ex.: inativado).
  const opcoes = [...(dados ?? []), ...iniciais.filter((c) => !dados?.some((d) => d.id === c.id))];
  const selecionados = campo.value
    .map((id) => opcoes.find((o) => o.id === id))
    .filter(Boolean) as Coordenador[];

  return (
    <>
      <CustomFormLabel htmlFor="coordenadores">Coordenadores</CustomFormLabel>
      <Autocomplete
        id="coordenadores"
        multiple
        loading={carregando}
        options={opcoes}
        value={selecionados}
        onChange={(_, valor) => ajudante.setValue(valor.map((c) => c.id))}
        getOptionLabel={(c) => c.nomeCompleto}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderOption={(props, c) => (
          <li {...props} key={c.id}>
            {c.nomeCompleto}
            <Typography variant="caption" color="textSecondary" ml={1}>
              {c.cargoNome}
            </Typography>
          </li>
        )}
        noOptionsText="Nenhum usuário encontrado"
        renderInput={(params) => (
          <CustomTextField
            {...params}
            placeholder={selecionados.length ? '' : 'Selecione um usuário do sistema'}
            helperText="Opcional: podem ser definidos depois."
          />
        )}
      />
    </>
  );
};

interface OpcaoContratante {
  nome: string;
  cidade: string;
}

const cidadeDe = (e: Empresa) => [e.municipio, e.uf].filter(Boolean).join('/');

/**
 * Contratante: só os cadastrados em Contratantes. A cidade vem do município do cadastro
 * (é só exibida aqui). Projeto antigo com contratante fora da lista continua com ele.
 */
const CampoContratante = ({ atual }: { atual: { nome: string; cidade: string } | null }) => {
  const [campo, meta, ajudante] = useField<string>('contratante');
  const { dados, carregando } = useConsulta(servicoEmpresas.listar);
  const cadastrados: OpcaoContratante[] = (dados ?? []).map((e) => ({ nome: e.razaoSocial, cidade: cidadeDe(e) }));
  const opcoes =
    atual && !cadastrados.some((o) => o.nome.toLowerCase() === atual.nome.toLowerCase()) ? [...cadastrados, atual] : cadastrados;
  const selecionado = opcoes.find((o) => o.nome.toLowerCase() === campo.value.toLowerCase()) ?? null;
  const erro = meta.touched && meta.error ? meta.error : undefined;

  return (
    <Grid container columnSpacing={3}>
      <Grid item xs={12} sm={8}>
        <CustomFormLabel htmlFor="contratante">Contratante</CustomFormLabel>
        <Autocomplete
          id="contratante"
          loading={carregando}
          options={opcoes}
          value={selecionado}
          onChange={(_, valor) => ajudante.setValue(valor?.nome ?? '')}
          onBlur={() => ajudante.setTouched(true)}
          getOptionLabel={(o) => o.nome}
          isOptionEqualToValue={(a, b) => a.nome === b.nome}
          renderOption={(props, o) => (
            <li {...props} key={o.nome}>
              {o.nome}
              {o.cidade ? (
                <Typography variant="caption" color="textSecondary" ml={1}>
                  {o.cidade}
                </Typography>
              ) : null}
            </li>
          )}
          noOptionsText="Nenhum contratante cadastrado com esse nome"
          renderInput={(params) => (
            <CustomTextField
              {...params}
              placeholder="Escolha um contratante cadastrado"
              error={!!erro}
              helperText={erro ?? 'Só aparecem os cadastrados em Contratantes.'}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <CustomFormLabel>Cidade do contratante</CustomFormLabel>
        <Typography mt={1.5} color={selecionado?.cidade ? 'textPrimary' : 'textSecondary'}>
          {selecionado ? selecionado.cidade || 'Sem município no cadastro' : '—'}
        </Typography>
      </Grid>
    </Grid>
  );
};

interface Props {
  aberto: boolean;
  projeto: GestaoProjeto | null;
  aoFechar: () => void;
  aoSalvar: (p: GestaoProjeto) => void;
}

/** Cadastro/edição do projeto. O status não fica aqui: o projeto começa Em espera e muda pelo Kanban. */
const FormularioGestaoProjeto = ({ aberto, projeto: p, aoFechar, aoSalvar }: Props) => {
  const valores: RequisicaoGestaoProjeto = {
    nome: p?.nome ?? '',
    processo: p?.processo ?? '',
    contratante: p?.contratante ?? '',
    prioridade: p?.prioridade ?? '',
    dataInicio: p?.dataInicio ?? '',
    dataFim: p?.dataFim ?? '',
    coordenadores: p?.coordenadores.map((c) => c.id) ?? [],
    convenioOrigem: p?.convenioOrigem ?? '',
    convenioNumero: p?.convenioNumero ?? '',
    valorConvenio: p?.valorConvenio ?? '',
    contrapartida: p?.contrapartida ?? '',
    origemRecurso: p?.origemRecurso ?? '',
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={p ? `Editar ${p.nome}` : 'Novo projeto'}
      valoresIniciais={valores}
      esquema={esquema}
      largura="md"
      rotuloSalvar={p ? 'Salvar alterações' : 'Criar projeto'}
      aoFechar={aoFechar}
      aoEnviar={async (v) =>
        aoSalvar(
          p ? await servicoGestaoProjetos.atualizar(p.id, v) : await servicoGestaoProjetos.criar(v),
        )
      }
    >
      <Grid container columnSpacing={3}>
        <Secao titulo="Identificação" />
        <Grid item xs={12}>
          <CampoFormik
            name="nome"
            rotulo="Nome do projeto"
            obrigatorio
            limite={LIMITES.GESTAO_PROJETO_NOME}
            autoFocus
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik
            name="processo"
            rotulo="Processo"
            limite={LIMITES.GESTAO_PROJETO_PROCESSO}
            placeholder="Ex.: 12345/2026"
          />
        </Grid>
        <Grid item xs={12}>
          <CampoContratante
            atual={p?.contratante ? { nome: p.contratante, cidade: p.contratanteCidade ?? '' } : null}
          />
        </Grid>

        <Secao titulo="Andamento" />
        <Grid item xs={12} sm={4}>
          <CampoFormik name="prioridade" rotulo="Prioridade" opcoes={OPCOES_PRIORIDADE} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik
            name="dataInicio"
            rotulo="Data de início"
            type="date"
            helperText="Vazia: fica a data de hoje."
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="dataFim" rotulo="Data de término" type="date" />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2" color="textSecondary" mt={1}>
            {p
              ? `Status: ${ROTULO_STATUS_GESTAO_PROJETO[p.status]} — para mudar, mova o cartão no Kanban.`
              : `O projeto começa em "${ROTULO_STATUS_GESTAO_PROJETO.EM_ESPERA}"; o status muda pelo Kanban.`}
          </Typography>
        </Grid>

        <Secao titulo="Coordenação" />
        <Grid item xs={12}>
          <CampoCoordenadores iniciais={p?.coordenadores ?? []} />
        </Grid>

        <Secao titulo="Convênio" />
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="convenioOrigem"
            rotulo="Origem do convênio"
            limite={LIMITES.GESTAO_PROJETO_CONVENIO_ORIGEM}
            placeholder="Ex.: Caixa"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="convenioNumero"
            rotulo="Número do convênio"
            limite={LIMITES.GESTAO_PROJETO_CONVENIO_NUMERO}
            placeholder="Ex.: 1234/2026"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="valorConvenio" rotulo="Valor do convênio (R$)" {...PROPS_VALOR} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="contrapartida" rotulo="Contrapartida (R$)" {...PROPS_VALOR} />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik
            name="origemRecurso"
            rotulo="Origem do recurso (político / emenda)"
            limite={LIMITES.GESTAO_PROJETO_ORIGEM_RECURSO}
            placeholder="Ex.: Emenda do Dep. Fulano de Tal"
          />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioGestaoProjeto;
