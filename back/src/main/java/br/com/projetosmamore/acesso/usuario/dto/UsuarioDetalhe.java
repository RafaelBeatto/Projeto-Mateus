package br.com.projetosmamore.acesso.usuario.dto;

import java.time.Instant;

import br.com.projetosmamore.acesso.usuario.Usuario;

/** Ficha completa do usuário (formulário de edição). */
public record UsuarioDetalhe(Long id, String login, String nome, String funcao, Short cargoId, String cargoNome,
        Long unidadeId, String unidadeNome, boolean ativo, boolean trocarSenha, Instant ultimoAcessoEm,
        Instant criadoEm) {

    public static UsuarioDetalhe de(Usuario u) {
        return new UsuarioDetalhe(u.getId(), u.getLogin(), u.getNome(), u.getFuncao(), u.getCargo().getId(),
                u.getCargo().getNome(), u.getUnidade().getId(), u.getUnidade().getNome(), u.isAtivo(),
                u.isTrocarSenha(), u.getUltimoAcessoEm(), u.getCriadoEm());
    }
}
