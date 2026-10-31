import { Autocomplete, Grid } from '@mui/material';
import { useField } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { LIMITES } from 'src/constantes/limites';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type {
  Coordenador,
  Etapa,
  RequisicaoTarefaEtapa,
  StatusTarefaEtapa,
  TarefaEtapa,
} from 'src/types/gestaoProjetos';
import { ROTULO_STATUS_TAREFA_ETAPA } from 'src/types/gestaoProjetos';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  texto: regras.obrigatorio(LIMITES.GESTAO_PROJETO_ETAPA_TAREFA),
  prazo: Yup.string(),
});

const OPCOES_STATUS = (Object.keys(ROTULO_STATUS_TAREFA_ETAPA) as StatusTarefaEtapa[]).map((s) => ({
  valor: s,
  rotulo: ROTULO_STATUS_TAREFA_ETAPA[s],
}));

/** Opção do "Depende de": uma etapa inteira ou uma tarefa, agrupadas pela etapa. */
interface OpcaoDependencia {
  tipo: 'etapa' | 'tarefa';
  id: number;
  rotulo: string;
  grupo: string;
}

/** Ids das tarefas que dependem (direta ou indiretamente) da tarefa — escolhê-las fecharia um ciclo. */
function dependentesDe(id: number, tarefas: TarefaEtapa[]) {
  const resultado = new Set<number>();
  const pendentes = [id];
  while (pendentes.length) {
    const atual = pendentes.pop()!;
    tarefas
      .filter((t) => t.dependencias.includes(atual) && !resultado.has(t.id))
      .forEach((t) => {
        resultado.add(t.id);
        pendentes.push(t.id);
      });
  }
  return resultado;
}

/** Etapas (menos a própria) e tarefas do projeto (menos ela mesma e quem já depende dela). */
function opcoesDe(etapas: Etapa[], etapaId: number, tarefaId?: number): OpcaoDependencia[] {
  const todas = etapas.flatMap((e) => e.tarefas);
  const bloqueadas = tarefaId ? dependentesDe(tarefaId, todas) : new Set<number>();
  // A etapa atual primeiro; depois as outras, na ordem do projeto.
  const ordenadas = [
    ...etapas.filter((e) => e.id === etapaId),
    ...etapas.filter((e) => e.id !== etapaId),
  ];
  return ordenadas.flatMap((e) => {
    const grupo = e.id === etapaId ? `${e.titulo} (esta etapa)` : e.titulo;
    return [
      ...(e.id === etapaId
        ? []
        : [{ tipo: 'etapa' as const, id: e.id, rotulo: `Etapa inteira: ${e.titulo}`, grupo }]),
      ...e.tarefas
        .filter((t) => t.id !== tarefaId && !bloqueadas.has(t.id))
        .map((t) => ({ tipo: 'tarefa' as const, id: t.id, rotulo: t.texto, grupo })),
    ];
  });
}

/** "Depende de": etapas e tarefas do projeto que precisam estar concluídas antes desta. */
const CampoDependencias = ({ opcoes }: { opcoes: OpcaoDependencia[] }) => {
  const [tarefas, , ajudanteTarefas] = useField<number[]>('dependencias');
  const [etapas, , ajudanteEtapas] = useField<number[]>('dependenciasEtapas');
  const selecionadas = opcoes.filter((o) =>
    o.tipo === 'etapa' ? etapas.value.includes(o.id) : tarefas.value.includes(o.id),
  );

  return (
    <>
      <CustomFormLabel htmlFor="dependencias">Depende de</CustomFormLabel>
      <Autocomplete
        id="dependencias"
        multiple
        options={opcoes}
        groupBy={(o) => o.grupo}
        value={selecionadas}
        onChange={(_, valor) => {
          ajudanteTarefas.setValue(valor.filter((o) => o.tipo === 'tarefa').map((o) => o.id));
          ajudanteEtapas.setValue(valor.filter((o) => o.tipo === 'etapa').map((o) => o.id));
        }}
        getOptionLabel={(o) => o.rotulo}
        isOptionEqualToValue={(a, b) => a.tipo === b.tipo && a.id === b.id}
        noOptionsText="Nenhuma outra etapa ou tarefa neste projeto"
        renderInput={(params) => (
          <CustomTextField
            {...params}
            placeholder={selecionadas.length ? '' : 'Selecione etapas ou tarefas do projeto'}
            helperText="Opcional: a tarefa só pode ser concluída depois destas (etapa: quando estiver Concluída)."
          />
        )}
      />
    </>
  );
};

interface Props {
  aberto: boolean;
  projetoId: number;
  etapaId: number;
  /** null = nova tarefa. */
  tarefa: TarefaEtapa | null;
  /** Todas as etapas do projeto, com as tarefas (opções de dependência). */
  etapas: Etapa[];
  pessoas: Coordenador[];
  aoFechar: () => void;
  aoSalvar: (e: Etapa) => void;
}

/** Modal de cadastro/edição de uma tarefa da etapa: nome, status, data, responsável e dependências. */
const FormularioTarefaEtapa = ({
  aberto,
  projetoId,
  etapaId,
  tarefa: t,
  etapas,
  pessoas,
  aoFechar,
  aoSalvar,
}: Props) => {
  const valores: RequisicaoTarefaEtapa = {
    texto: t?.texto ?? '',
    status: t?.status ?? 'EM_ESPERA',
    prazo: t?.prazo ?? '',
    responsavelId: t?.responsavel?.id ?? '',
    dependencias: t?.dependencias ?? [],
    dependenciasEtapas: t?.dependenciasEtapas ?? [],
  };
  // Quem já é responsável continua na lista mesmo se não estiver mais ativo.
  const opcoesPessoas = [
    ...pessoas,
    ...(t?.responsavel && !pessoas.some((p) => p.id === t.responsavel!.id) ? [t.responsavel] : []),
  ];

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={t ? 'Editar tarefa' : 'Nova tarefa'}
      valoresIniciais={valores}
      esquema={esquema}
      rotuloSalvar={t ? 'Salvar alterações' : 'Criar tarefa'}
      aoFechar={aoFechar}
      aoEnviar={async (v) =>
        aoSalvar(
          t
            ? await servicoGestaoProjetos.atualizarTarefaEtapa(projetoId, etapaId, t.id, v)
            : await servicoGestaoProjetos.criarTarefaEtapa(projetoId, etapaId, v),
        )
      }
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik
            name="texto"
            rotulo="Nome"
            obrigatorio
            limite={LIMITES.GESTAO_PROJETO_ETAPA_TAREFA}
            placeholder="Ex.: Pedir orçamento"
            autoFocus
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="status" rotulo="Status" opcoes={OPCOES_STATUS} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik name="prazo" rotulo="Data" type="date" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <CampoFormik
            name="responsavelId"
            rotulo="Responsável"
            opcoes={[
              { valor: '', rotulo: 'Sem responsável' },
              ...opcoesPessoas.map((p) => ({ valor: p.id, rotulo: p.nomeCompleto })),
            ]}
          />
        </Grid>
        <Grid item xs={12}>
          <CampoDependencias opcoes={opcoesDe(etapas, etapaId, t?.id)} />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioTarefaEtapa;
