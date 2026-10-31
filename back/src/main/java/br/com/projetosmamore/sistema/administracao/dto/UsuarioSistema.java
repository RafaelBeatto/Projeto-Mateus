package br.com.projetosmamore.sistema.administracao.dto;

import java.time.Instant;

import br.com.projetosmamore.acesso.usuario.Usuario;

/** Linha da lista de usuários de todas as unidades (tela do dono). */
public record UsuarioSistema(Long id, String login, String nomeCompleto, String funcao, String cargoNome,
        Long unidadeId, String unidadeNome, boolean ativo, boolean trocarSenha, boolean conectado, boolean dono,
        Instant ultimoAcessoEm, Instant criadoEm) {

    public static UsuarioSistema de(Usuario u, boolean conectado, boolean dono) {
        return new UsuarioSistema(u.getId(), u.getLogin(), u.nomeCompleto(), u.getFuncao(), u.getCargo().getNome(),
                u.getUnidade().getId(), u.getUnidade().getNome(), u.isAtivo(), u.isTrocarSenha(), conectado, dono,
                u.getUltimoAcessoEm(), u.getCriadoEm());
    }
}
