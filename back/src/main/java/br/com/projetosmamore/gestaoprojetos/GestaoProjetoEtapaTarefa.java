package br.com.projetosmamore.gestaoprojetos;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import br.com.projetosmamore.comum.Limites;
import br.com.projetosmamore.comum.entidade.EntidadeBase;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tarefa da lista de uma etapa: nome, prazo e responsável; marcada como feita no checklist.
 * Pode depender de outras tarefas ou de etapas inteiras do mesmo projeto: só é concluída depois delas.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "etapa_tarefa", schema = "gestao_projetos")
public class GestaoProjetoEtapaTarefa extends EntidadeBase {

    @Column(name = "etapa_id", nullable = false, updatable = false)
    private Long etapaId;

    @Setter
    @Column(nullable = false, length = Limites.GESTAO_PROJETO_ETAPA_TAREFA)
    private String texto;

    @Setter
    @Column(nullable = false)
    private boolean feita;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private StatusTarefaEtapa status = StatusTarefaEtapa.EM_ESPERA;

    @Column(nullable = false)
    private short ordem;

    @Setter
    private LocalDate prazo;

    @Setter
    @Column(name = "responsavel_id")
    private Long responsavelId;

    /** Ids das tarefas (de qualquer etapa do projeto) que precisam estar feitas antes desta. */
    @ElementCollection
    @CollectionTable(name = "etapa_tarefa_dependencia", schema = "gestao_projetos",
            joinColumns = @JoinColumn(name = "tarefa_id"))
    @Column(name = "depende_de_id", nullable = false)
    private Set<Long> dependencias = new HashSet<>();

    /** Ids das etapas (do projeto) que precisam estar concluídas antes desta. */
    @ElementCollection
    @CollectionTable(name = "etapa_tarefa_dependencia_etapa", schema = "gestao_projetos",
            joinColumns = @JoinColumn(name = "tarefa_id"))
    @Column(name = "etapa_id", nullable = false)
    private Set<Long> dependenciasEtapas = new HashSet<>();

    public GestaoProjetoEtapaTarefa(Long etapaId, short ordem) {
        this.etapaId = etapaId;
        this.ordem = ordem;
    }

    public void definirDependencias(Set<Long> tarefaIds, Set<Long> etapaIds) {
        dependencias.clear();
        dependencias.addAll(tarefaIds);
        dependenciasEtapas.clear();
        dependenciasEtapas.addAll(etapaIds);
    }
}
