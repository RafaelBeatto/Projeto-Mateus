package br.org.apae.secretaria.gestaoprojetos.dto;

import java.time.Instant;

import br.org.apae.secretaria.gestaoprojetos.GestaoProjetoMensagem;

/** Mensagem do chat do projeto, com quem enviou (é uma conversa em grupo). */
public record MensagemProjetoResposta(Long id, Long projetoId, CoordenadorResposta remetente, String texto, Instant enviadaEm) {

    public static MensagemProjetoResposta de(GestaoProjetoMensagem m, CoordenadorResposta remetente) {
        return new MensagemProjetoResposta(m.getId(), m.getProjetoId(), remetente, m.getTexto(), m.getEnviadaEm());
    }
}
