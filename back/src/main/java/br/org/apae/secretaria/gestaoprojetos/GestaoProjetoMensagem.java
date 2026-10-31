package br.org.apae.secretaria.gestaoprojetos;

import java.time.Instant;

import br.org.apae.secretaria.comum.Limites;
import br.org.apae.secretaria.comum.entidade.EntidadeBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Mensagem do chat de um projeto da Gestão de Projetos (conversa em grupo, uma por projeto). */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "projeto_mensagem", schema = "gestao_projetos")
public class GestaoProjetoMensagem extends EntidadeBase {

    @Column(name = "projeto_id", nullable = false, updatable = false)
    private Long projetoId;

    @Column(name = "remetente_id", nullable = false, updatable = false)
    private Long remetenteId;

    @Column(nullable = false, length = Limites.MENSAGEM_TEXTO, updatable = false)
    private String texto;

    @Column(name = "enviada_em", nullable = false, updatable = false)
    private Instant enviadaEm;

    GestaoProjetoMensagem(Long projetoId, Long remetenteId, String texto) {
        this.projetoId = projetoId;
        this.remetenteId = remetenteId;
        this.texto = texto;
        this.enviadaEm = Instant.now();
    }
}
