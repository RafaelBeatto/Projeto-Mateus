package br.org.apae.secretaria.sistema.administracao.dto;

import java.time.Instant;

/** Usuário com sessão aberta (token de renovação válido), em qualquer unidade. */
public record SessaoAtiva(Long usuarioId, String login, String nome, String cargoNome, String unidadeNome,
        long sessoes, Instant ultimaEntrada, Instant expiraEm) {
}
