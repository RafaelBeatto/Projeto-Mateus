package br.com.projetosmamore.gestaoprojetos.dto;

import br.com.projetosmamore.gestaoprojetos.StatusEtapa;
import jakarta.validation.constraints.NotNull;

/** Mudança de coluna no Kanban de etapas. */
public record RequisicaoStatusEtapa(@NotNull StatusEtapa status) {
}
