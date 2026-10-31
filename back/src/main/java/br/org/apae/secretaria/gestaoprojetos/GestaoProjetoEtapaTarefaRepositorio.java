package br.org.apae.secretaria.gestaoprojetos;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GestaoProjetoEtapaTarefaRepositorio extends JpaRepository<GestaoProjetoEtapaTarefa, Long> {

    List<GestaoProjetoEtapaTarefa> findByEtapaIdOrderByOrdemAscIdAsc(Long etapaId);

    List<GestaoProjetoEtapaTarefa> findByEtapaIdInOrderByOrdemAscIdAsc(Collection<Long> etapaIds);

    long countByEtapaId(Long etapaId);
}
