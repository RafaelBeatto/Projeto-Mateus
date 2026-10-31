package br.org.apae.secretaria.gestaoprojetos;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.comum.entidade.EntidadeAuditavel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Projeto da Gestão de Projetos (independente do módulo Projetos de recursos/execuções):
 * identificação, andamento, coordenação e convênio. Prioridade nula = "Nada".
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "projeto", schema = "gestao_projetos")
public class GestaoProjeto extends EntidadeAuditavel {

    @Column(name = "unidade_id", nullable = false, updatable = false)
    private Long unidadeId;

    @Setter
    @Column(nullable = false, length = Limites.GESTAO_PROJETO_NOME)
    private String nome;

    @Setter
    @Column(length = Limites.GESTAO_PROJETO_PROCESSO)
    private String processo;

    @Setter
    @Column(length = Limites.GESTAO_PROJETO_CONTRATANTE)
    private String contratante;

    /** Obrigatória quando há contratante. */
    @Setter
    @Column(name = "contratante_cidade", length = Limites.GESTAO_PROJETO_CONTRATANTE_CIDADE)
    private String contratanteCidade;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private StatusGestaoProjeto status = StatusGestaoProjeto.EM_ESPERA;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Prioridade prioridade;

    @Setter
    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Setter
    @Column(name = "data_fim")
    private LocalDate dataFim;

    @Setter
    @Column(name = "convenio_origem", length = Limites.GESTAO_PROJETO_CONVENIO_ORIGEM)
    private String convenioOrigem;

    @Setter
    @Column(name = "convenio_numero", length = Limites.GESTAO_PROJETO_CONVENIO_NUMERO)
    private String convenioNumero;

    @Setter
    @Column(name = "valor_convenio", precision = 14, scale = 2)
    private BigDecimal valorConvenio;

    @Setter
    @Column(precision = 14, scale = 2)
    private BigDecimal contrapartida;

    @Setter
    @Column(name = "origem_recurso", length = Limites.GESTAO_PROJETO_ORIGEM_RECURSO)
    private String origemRecurso;

    /** Nulo = ativo (no Kanban); preenchido = arquivado (só em "Arquivados"). */
    @Setter
    @Column(name = "arquivado_em")
    private Instant arquivadoEm;

    /** Nulo = fora da lixeira; preenchido = na lixeira (restaurável até ser excluído de vez). */
    @Setter
    @Column(name = "excluido_em")
    private Instant excluidoEm;

    @Column(name = "criado_por_id", updatable = false)
    private Long criadoPorId;

    public GestaoProjeto(Long unidadeId, Long criadoPorId) {
        this.unidadeId = unidadeId;
        this.criadoPorId = criadoPorId;
    }
}
