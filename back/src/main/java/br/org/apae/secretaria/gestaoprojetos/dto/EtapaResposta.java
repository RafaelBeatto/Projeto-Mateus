package br.org.apae.secretaria.gestaoprojetos.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import br.org.apae.secretaria.gestaoprojetos.GestaoProjetoEtapa;
import br.org.apae.secretaria.gestaoprojetos.GestaoProjetoEtapaTarefa;
import br.org.apae.secretaria.gestaoprojetos.StatusEtapa;
import br.org.apae.secretaria.gestaoprojetos.StatusTarefaEtapa;

/** Etapa com os responsáveis (da etapa e de cada tarefa) já resolvidos e a lista de tarefas, em ordem. */
public record EtapaResposta(
        Long id, Long projetoId, Long etapaPaiId, String titulo, String descricao, StatusEtapa status, CoordenadorResposta responsavel,
        LocalDate prazo, List<TarefaEtapaResposta> tarefas, Instant criadoEm, Instant atualizadoEm) {

    public record TarefaEtapaResposta(
            Long id, String texto, boolean feita, StatusTarefaEtapa status, LocalDate prazo, CoordenadorResposta responsavel, List<Long> dependencias,
            List<Long> dependenciasEtapas) {
    }

    /** {@code pessoas}: os responsáveis da etapa e das tarefas, por id. */
    public static EtapaResposta de(GestaoProjetoEtapa e, List<GestaoProjetoEtapaTarefa> tarefas, Map<Long, CoordenadorResposta> pessoas) {
        return new EtapaResposta(e.getId(), e.getProjetoId(), e.getEtapaPaiId(), e.getTitulo(), e.getDescricao(), e.getStatus(),
                pessoa(e.getResponsavelId(), pessoas), e.getPrazo(),
                tarefas.stream().map(t -> new TarefaEtapaResposta(t.getId(), t.getTexto(), t.isFeita(), t.getStatus(), t.getPrazo(),
                        pessoa(t.getResponsavelId(), pessoas), t.getDependencias().stream().sorted().toList(),
                        t.getDependenciasEtapas().stream().sorted().toList()))
                        .toList(),
                e.getCriadoEm(), e.getAtualizadoEm());
    }

    private static CoordenadorResposta pessoa(Long id, Map<Long, CoordenadorResposta> pessoas) {
        return id == null ? null : pessoas.get(id);
    }
}
