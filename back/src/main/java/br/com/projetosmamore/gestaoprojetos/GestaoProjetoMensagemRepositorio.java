package br.com.projetosmamore.gestaoprojetos;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GestaoProjetoMensagemRepositorio extends JpaRepository<GestaoProjetoMensagem, Long> {

    /** Mais recentes primeiro; "antesDeId" pagina para trás (rolagem para cima). */
    @Query("""
            select m from GestaoProjetoMensagem m
             where m.projetoId = :projetoId and (:antesDeId = 0 or m.id < :antesDeId)
             order by m.id desc
            """)
    List<GestaoProjetoMensagem> recentes(Long projetoId, long antesDeId, Pageable limite);

    /** Mensagens que chegaram depois da última que a tela já tem (atualização periódica). */
    @Query("""
            select m from GestaoProjetoMensagem m
             where m.projetoId = :projetoId and m.id > :depoisDeId
             order by m.id asc
            """)
    List<GestaoProjetoMensagem> novas(Long projetoId, long depoisDeId, Pageable limite);

    List<GestaoProjetoMensagem> findByProjetoId(Long projetoId);
}
