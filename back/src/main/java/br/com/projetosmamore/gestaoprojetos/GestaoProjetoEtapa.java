package br.com.projetosmamore.gestaoprojetos;

import java.time.LocalDate;

import br.com.projetosmamore.comum.Limites;
import br.com.projetosmamore.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Etapa de um projeto da Gestão de Projetos (cartão do Kanban de etapas). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "projeto_etapa", schema = "gestao_projetos")
public class GestaoProjetoEtapa extends EntidadeAuditavel {

    @Column(name = "projeto_id", nullable = false, updatable = false)
    private Long projetoId;

    @Setter
    @Column(nullable = false, length = Limites.GESTAO_PROJETO_ETAPA_TITULO)
    private String titulo;

    @Setter
    @Column(length = Limites.TEXTO_LONGO)
    private String descricao;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private StatusEtapa status = StatusEtapa.EM_ESPERA;

    @Setter
    @Column(name = "responsavel_id")
    private Long responsavelId;

    @Setter
    private LocalDate prazo;

    /** Ramificação: a etapa de onde esta sai no mapa (nula = sai direto do projeto). */
    @Setter
    @Column(name = "etapa_pai_id")
    private Long etapaPaiId;

    public GestaoProjetoEtapa(Long projetoId) {
        this.projetoId = projetoId;
    }
}
