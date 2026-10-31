package br.com.projetosmamore.gestaoprojetos;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GestaoProjetoCoordenadorRepositorio extends JpaRepository<GestaoProjetoCoordenador, Long> {

    List<GestaoProjetoCoordenador> findByProjetoIdOrderByCriadoEmAsc(Long projetoId);

    List<GestaoProjetoCoordenador> findByProjetoIdIn(Collection<Long> projetoIds);
}
