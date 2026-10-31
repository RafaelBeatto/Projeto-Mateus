package br.com.projetosmamore.acesso.autenticacao.dto;

import br.com.projetosmamore.comum.Limites;
import br.com.projetosmamore.comum.validacao.SenhaForte;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequisicaoTrocarSenha(
        @NotBlank @Size(max = Limites.SENHA_MAXIMO) String senhaAtual,
        @SenhaForte String novaSenha) {
}
