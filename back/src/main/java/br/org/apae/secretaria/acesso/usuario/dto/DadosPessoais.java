package br.org.apae.secretaria.acesso.usuario.dto;

/** Campos comuns à criação e à edição de usuário (evita repetir o mapeamento no serviço). */
public interface DadosPessoais {

    String nome();

    String funcao();

    Short cargoId();

    Long unidadeId();
}
