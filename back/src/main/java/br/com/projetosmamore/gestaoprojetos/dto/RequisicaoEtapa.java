package br.com.projetosmamore.gestaoprojetos.dto;

import java.time.LocalDate;

import br.com.projetosmamore.comum.Limites;
import br.com.projetosmamore.gestaoprojetos.StatusEtapa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cadastro/edição de etapa. Status vazio na criação = Em espera (no Kanban, a coluna onde foi criada).
 * etapaPaiId: a ramificação de onde ela sai (vazio = direto do projeto).
 */
public record RequisicaoEtapa(
        @NotBlank @Size(max = Limites.GESTAO_PROJETO_ETAPA_TITULO) String titulo,
        @Size(max = Limites.TEXTO_LONGO) String descricao,
        Long responsavelId,
        LocalDate prazo,
        StatusEtapa status,
        Long etapaPaiId) {
}
