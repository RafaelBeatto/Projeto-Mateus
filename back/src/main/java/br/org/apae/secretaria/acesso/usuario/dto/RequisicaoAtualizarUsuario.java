package br.org.apae.secretaria.acesso.usuario.dto;

import br.org.apae.secretaria.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RequisicaoAtualizarUsuario(
        @NotBlank @Size(max = Limites.USUARIO_NOME) String nome,
        @Size(max = Limites.USUARIO_FUNCAO) String funcao,
        @NotNull Short cargoId,
        @NotNull Long unidadeId) implements DadosPessoais {
}
