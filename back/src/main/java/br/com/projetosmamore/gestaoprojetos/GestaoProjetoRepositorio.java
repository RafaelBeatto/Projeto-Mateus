package br.com.projetosmamore.gestaoprojetos;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Ativos = nem arquivados nem na lixeira; arquivados fora da lixeira; lixeira com ou sem arquivamento. */
public interface GestaoProjetoRepositorio extends JpaRepository<GestaoProjeto, Long> {

    List<GestaoProjeto> findByUnidadeIdAndArquivadoEmIsNullAndExcluidoEmIsNullOrderByNomeAsc(Long unidadeId);

    List<GestaoProjeto> findByUnidadeIdAndArquivadoEmIsNotNullAndExcluidoEmIsNullOrderByArquivadoEmDesc(Long unidadeId);

    List<GestaoProjeto> findByUnidadeIdAndExcluidoEmIsNotNullOrderByExcluidoEmDesc(Long unidadeId);

    /** Ativos e arquivados (fora da lixeira), para a pesquisa geral. */
    List<GestaoProjeto> findByUnidadeIdAndExcluidoEmIsNull(Long unidadeId);
}
