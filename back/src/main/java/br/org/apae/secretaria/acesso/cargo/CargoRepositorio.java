package br.org.apae.secretaria.acesso.cargo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CargoRepositorio extends JpaRepository<Cargo, Short> {

    List<Cargo> findAllByOrderByNivelAscIdAsc();

    Optional<Cargo> findByCodigo(String codigo);
}
