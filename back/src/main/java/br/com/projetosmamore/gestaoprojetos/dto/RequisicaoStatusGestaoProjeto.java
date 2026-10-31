package br.com.projetosmamore.gestaoprojetos.dto;

import br.com.projetosmamore.gestaoprojetos.StatusGestaoProjeto;
import jakarta.validation.constraints.NotNull;

/** Mudança de coluna no Kanban. */
public record RequisicaoStatusGestaoProjeto(@NotNull StatusGestaoProjeto status) {
}
