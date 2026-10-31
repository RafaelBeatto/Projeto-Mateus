import { Grid } from '@mui/material';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Coordenador, Etapa, RequisicaoEtapa, StatusEtapa } from 'src/types/gestaoProjetos';
import { ROTULO_STATUS_ETAPA } from 'src/types/gestaoProjetos';
import { descendentesDe } from 'src/utils/gestaoProjetos';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  titulo: regras.obrigatorio(LIMITES.GESTAO_PROJETO_ETAPA_TITULO),
  descricao: regras.texto(LIMITES.TEXTO_LONGO),
  prazo: Yup.string(),
});

const OPCOES_STATUS = (Object.keys(ROTULO_STATUS_ETAPA) as StatusEtapa[]).map((s) => ({
  valor: s,
  rotulo: ROTULO_STATUS_ETAPA[s],
}));

interface Props {
  aberto: boolean;
  projetoId: number;
  etapa: Etapa | null;
  /** Coluna onde a etapa nasce (botão "Nova etapa" = Em espera). */
  statusInicial?: StatusEtapa;
  /** Etapas do projeto, para escolher de onde esta sai. */
  etapas: Etapa[];
  pessoas: Coordenador[];
  aoFechar: () => void;
  aoSalvar: (e: Etapa) => void;
}

/** Cadastro/edição de uma etapa do projeto. */
const FormularioEtapa = ({
  aberto,
  projetoId,
  etapa: e,
  statusInicial = 'EM_ESPERA',
  etapas,
  pessoas,
  aoFechar,
  aoSalvar,
}: Props) => {
  const valores: RequisicaoEtapa = {
    titulo: e?.titulo ?? '',
    descricao: e?.descricao ?? '',
    responsavelId: e?.responsavel?.id ?? '',
    prazo: e?.prazo ?? '',
    status: e?.status ?? statusInicial,
    etapaPaiId: e?.etapaPaiId ?? '',
  };
  // Não pode sair dela mesma nem de uma ramificação dela.
  const bloqueadas = e ? descendentesDe(e.id, etapas) : new Set<number>();
  const opcoesPai = [
    { valor: '', rotulo: 'Direto do projeto' },
    ...etapas
      .filter((x) => x.id !== e?.id && !bloqueadas.has(x.id))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
      .map((x) => ({ valor: x.id, rotulo: x.titulo })),
  ];
  // Quem já é responsável continua na lista mesmo se não estiver mais ativo.
  const opcoesPessoas = [
    ...pessoas,
    ...(e?.responsavel && !pessoas.some((p) => p.id === e.responsavel!.id) ? [e.responsavel] : []),
  ];

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={e ? 'Editar etapa' : 'Nova etapa'}
      valoresIniciais={valores}
      esquema={esquema}
      rotuloSalvar={e ? 'Salvar alterações' : 'Criar etapa'}
      aoFechar={aoFechar}
      aoEnviar={async (v) =>
        aoSalvar(
          e
            ? await servicoGestaoProjetos.atualizarEtapa(projetoId, e.id, v)
            : await servicoGestaoProjetos.criarEtapa(projetoId, v),
        )
      }
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik
            name="titulo"
            rotulo="Etapa"
            obrigatorio
            limite={LIMITES.GESTAO_PROJETO_ETAPA_TITULO}
            placeholder="Ex.: Enviar plano de trabalho"
            autoFocus
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="responsavelId"
            rotulo="Responsável"
            opcoes={[
              { valor: '', rotulo: 'Sem responsável' },
              ...opcoesPessoas.map((p) => ({ valor: p.id, rotulo: p.nomeCompleto })),
            ]}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="prazo" rotulo="Prazo" type="date" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik name="status" rotulo="Situação" opcoes={OPCOES_STATUS} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="etapaPaiId"
            rotulo="Sai de"
            opcoes={opcoesPai}
            helperText="De onde esta ramificação sai no mapa."
          />
        </Grid>
        <Grid item xs={12}>
          <CampoFormik
            name="descricao"
            rotulo="Descrição"
            multiline
            minRows={3}
            limite={LIMITES.TEXTO_LONGO}
          />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioEtapa;
