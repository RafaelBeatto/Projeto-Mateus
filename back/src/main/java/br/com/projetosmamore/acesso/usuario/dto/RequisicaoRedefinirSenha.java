package br.com.projetosmamore.acesso.usuario.dto;

import br.com.projetosmamore.comum.validacao.SenhaForte;

/** Senha provisória definida por um superior; o usuário troca no próximo acesso. */
public record RequisicaoRedefinirSenha(@SenhaForte String senhaProvisoria) {
}
