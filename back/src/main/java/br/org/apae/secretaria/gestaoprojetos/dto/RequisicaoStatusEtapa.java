package br.org.apae.secretaria.gestaoprojetos.dto;

import br.org.apae.secretaria.gestaoprojetos.StatusEtapa;
import jakarta.validation.constraints.NotNull;

/** Mudança de coluna no Kanban de etapas. */
public record RequisicaoStatusEtapa(@NotNull StatusEtapa status) {
}
