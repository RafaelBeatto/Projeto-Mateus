package br.org.apae.secretaria.sistema.administracao.dto;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.validacao.Cnpj;
import br.org.apae.secretaria.comum.validacao.SenhaForte;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Nova empresa e o acesso do administrador dela, definidos pelo dono do sistema.
 * trocarSenha = o administrador cria uma senha própria no primeiro acesso.
 */
public record RequisicaoNovaEmpresa(
        @NotBlank @Size(max = Limites.UNIDADE_NOME) String nome,
        @Cnpj @Size(max = Limites.CNPJ) String cnpj,
        @NotBlank @Size(max = Limites.USUARIO_NOME) String administradorNome,
        @NotBlank @Size(min = 3, max = Limites.USUARIO_LOGIN)
        @Pattern(regexp = "^[A-Za-z0-9._-]+$", message = "use só letras, números, ponto, hífen ou sublinhado")
        String login,
        @SenhaForte String senha,
        boolean trocarSenha) {
}
