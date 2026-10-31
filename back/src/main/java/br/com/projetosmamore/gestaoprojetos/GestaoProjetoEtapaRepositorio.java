package br.com.projetosmamore.gestaoprojetos;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GestaoProjetoEtapaRepositorio extends JpaRepository<GestaoProjetoEtapa, Long> {

    List<GestaoProjetoEtapa> findByProjetoIdOrderByCriadoEmAsc(Long projetoId);

    List<GestaoProjetoEtapa> findByProjetoIdIn(Collection<Long> projetoIds);

    List<GestaoProjetoEtapa> findByEtapaPaiId(Long etapaPaiId);
}
