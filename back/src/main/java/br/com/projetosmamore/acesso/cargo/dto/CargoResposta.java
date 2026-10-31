package br.com.projetosmamore.acesso.cargo.dto;

import br.com.projetosmamore.acesso.cargo.Cargo;

public record CargoResposta(Short id, String codigo, String nome, short nivel) {

    public static CargoResposta de(Cargo cargo) {
        return new CargoResposta(cargo.getId(), cargo.getCodigo(), cargo.getNome(), cargo.getNivel());
    }
}
