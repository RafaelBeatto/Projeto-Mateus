package br.com.projetosmamore.gestaoprojetos.dto;

import java.time.LocalDate;
import java.util.List;

import br.com.projetosmamore.comum.Limites;
import br.com.projetosmamore.gestaoprojetos.StatusTarefaEtapa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Lista de tarefas de uma etapa. Prazo/responsável vazios = sem prazo/sem responsável. */
public final class RequisicoesTarefaEtapa {

    private RequisicoesTarefaEtapa() {
    }

    /**
     * Cadastro/edição (modal da tarefa). Dependências: tarefas e etapas do mesmo projeto (vazio = nenhuma).
     * Status vazio = Em espera; Concluída marca a tarefa como feita.
     */
    public record Dados(
            @NotBlank @Size(max = Limites.GESTAO_PROJETO_ETAPA_TAREFA) String texto,
            StatusTarefaEtapa status,
            LocalDate prazo,
            Long responsavelId,
            List<Long> dependencias,
            List<Long> dependenciasEtapas) {
    }

    public record Marcar(@NotNull Boolean feita) {
    }
}
