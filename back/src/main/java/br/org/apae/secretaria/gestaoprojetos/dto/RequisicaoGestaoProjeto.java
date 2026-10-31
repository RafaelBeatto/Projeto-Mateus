package br.org.apae.secretaria.gestaoprojetos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.dominio.Prioridade;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cadastro/edição de projeto. O status não vem aqui: o projeto nasce Em espera e
 * muda pelo Kanban. Prioridade nula = "Nada"; data de início vazia = hoje.
 */
public record RequisicaoGestaoProjeto(
        @NotBlank @Size(max = Limites.GESTAO_PROJETO_NOME) String nome,
        @Size(max = Limites.GESTAO_PROJETO_PROCESSO) String processo,
        // Razão social de um contratante cadastrado; a cidade vem do município dele.
        @Size(max = Limites.GESTAO_PROJETO_CONTRATANTE) String contratante,
        Prioridade prioridade,
        LocalDate dataInicio,
        LocalDate dataFim,
        List<Long> coordenadores,
        @Size(max = Limites.GESTAO_PROJETO_CONVENIO_ORIGEM) String convenioOrigem,
        @Size(max = Limites.GESTAO_PROJETO_CONVENIO_NUMERO) String convenioNumero,
        @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal valorConvenio,
        @DecimalMin("0.00") @Digits(integer = 12, fraction = 2) BigDecimal contrapartida,
        @Size(max = Limites.GESTAO_PROJETO_ORIGEM_RECURSO) String origemRecurso) {

    @AssertTrue(message = "A data de término não pode ser anterior à de início.")
    public boolean isPeriodoValido() {
        return dataInicio == null || dataFim == null || !dataFim.isBefore(dataInicio);
    }
}
