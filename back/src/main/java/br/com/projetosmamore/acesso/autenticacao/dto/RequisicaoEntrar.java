package br.com.projetosmamore.acesso.autenticacao.dto;

import br.com.projetosmamore.comum.Limites;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequisicaoEntrar(
        @NotBlank @Size(max = Limites.USUARIO_LOGIN) String login,
        @NotBlank @Size(max = Limites.SENHA_MAXIMO) String senha) {
}
