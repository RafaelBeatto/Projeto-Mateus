package br.org.apae.secretaria.gestaoprojetos.dto;

/** true = arquivar (sai do Kanban); false = desarquivar (volta para a coluna em que estava). */
public record RequisicaoArquivarGestaoProjeto(boolean arquivado) {
}
