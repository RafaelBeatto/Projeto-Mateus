package br.org.apae.secretaria.gestaoprojetos;

import br.org.apae.secretaria.comum.entidade.EntidadeCriada;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Usuário do sistema que coordena um projeto da Gestão de Projetos. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "projeto_coordenador", schema = "gestao_projetos")
public class GestaoProjetoCoordenador extends EntidadeCriada {

    @Column(name = "projeto_id", nullable = false, updatable = false)
    private Long projetoId;

    @Column(name = "usuario_id", nullable = false, updatable = false)
    private Long usuarioId;

    public GestaoProjetoCoordenador(Long projetoId, Long usuarioId) {
        this.projetoId = projetoId;
        this.usuarioId = usuarioId;
    }
}
