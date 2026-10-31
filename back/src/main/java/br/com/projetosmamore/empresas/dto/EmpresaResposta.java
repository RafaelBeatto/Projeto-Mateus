package br.com.projetosmamore.empresas.dto;

import java.time.Instant;

import br.com.projetosmamore.empresas.Empresa;

/** Contratante como aparece na lista e na ficha. */
public record EmpresaResposta(
        Long id, String razaoSocial, String nomeFantasia, String cnpj, String telefone, String email, String endereco,
        String municipio, String uf, String representante, Instant criadoEm, Instant atualizadoEm) {

    public static EmpresaResposta de(Empresa e) {
        return new EmpresaResposta(e.getId(), e.getRazaoSocial(), e.getNomeFantasia(), e.getCnpj(), e.getTelefone(),
                e.getEmail(), e.getEndereco(), e.getMunicipio(), e.getUf(), e.getRepresentante(), e.getCriadoEm(),
                e.getAtualizadoEm());
    }
}
