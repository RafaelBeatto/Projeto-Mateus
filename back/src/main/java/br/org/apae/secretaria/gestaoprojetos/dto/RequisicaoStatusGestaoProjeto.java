package br.org.apae.secretaria.gestaoprojetos.dto;

import br.org.apae.secretaria.gestaoprojetos.StatusGestaoProjeto;
import jakarta.validation.constraints.NotNull;

/** Mudança de coluna no Kanban. */
public record RequisicaoStatusGestaoProjeto(@NotNull StatusGestaoProjeto status) {
}
