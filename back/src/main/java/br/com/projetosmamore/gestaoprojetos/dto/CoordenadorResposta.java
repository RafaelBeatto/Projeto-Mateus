package br.com.projetosmamore.gestaoprojetos.dto;

import br.com.projetosmamore.acesso.usuario.Usuario;

/** Usuário do sistema que coordena (ou pode coordenar) um projeto. */
public record CoordenadorResposta(Long id, String nomeCompleto, String cargoNome) {

    public static CoordenadorResposta de(Usuario usuario) {
        return new CoordenadorResposta(usuario.getId(), usuario.nomeCompleto(), usuario.getCargo().getNome());
    }
}
