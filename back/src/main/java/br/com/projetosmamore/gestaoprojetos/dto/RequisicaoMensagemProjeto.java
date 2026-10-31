package br.com.projetosmamore.gestaoprojetos.dto;

import br.com.projetosmamore.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequisicaoMensagemProjeto(@NotBlank @Size(max = Limites.MENSAGEM_TEXTO) String texto) {
}
