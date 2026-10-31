package br.org.apae.secretaria.gestaoprojetos.dto;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequisicaoMensagemProjeto(@NotBlank @Size(max = Limites.MENSAGEM_TEXTO) String texto) {
}
