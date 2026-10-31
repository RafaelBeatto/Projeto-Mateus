package br.com.projetosmamore.acesso.usuario;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {

    @EntityGraph(attributePaths = { "cargo", "unidade" })
    Optional<Usuario> findByLoginIgnoreCase(String login);

    @EntityGraph(attributePaths = { "cargo", "unidade" })
    Optional<Usuario> findComCargoEUnidadeById(Long id);

    boolean existsByLoginIgnoreCase(String login);

    boolean existsByLoginIgnoreCaseAndIdNot(String login, Long id);

    /** "busca" vazia traz todos da unidade. */
    @EntityGraph(attributePaths = { "cargo", "unidade" })
    @Query("""
            select u from Usuario u
             where u.unidade.id = :unidadeId
               and lower(concat(u.nome, ' ', u.login)) like lower(concat('%', :busca, '%'))
            """)
    Page<Usuario> buscar(Long unidadeId, String busca, Pageable paginacao);

    /**
     * Tela do dono do sistema: usuários de todas as unidades (busca também pelo nome da unidade).
     * Filtros nulos não restringem.
     */
    @EntityGraph(attributePaths = { "cargo", "unidade" })
    @Query("""
            select u from Usuario u
             where lower(concat(u.nome, ' ', u.login, ' ', u.unidade.nome)) like lower(concat('%', :busca, '%'))
               and (:ativo is null or u.ativo = :ativo)
               and (:trocarSenha is null or u.trocarSenha = :trocarSenha)
            """)
    Page<Usuario> buscarEmTodasUnidades(String busca, Boolean ativo, Boolean trocarSenha, Pageable paginacao);

    /** Usuários de uma árvore de unidades (ex.: a empresa inteira). */
    @Query("select u.id from Usuario u where u.unidade.caminho like concat(:caminho, '%')")
    List<Long> idsNaArvore(String caminho);

    /** Colegas de unidade disponíveis para conversar no chat. */
    @EntityGraph(attributePaths = { "cargo" })
    List<Usuario> findByUnidadeIdAndAtivoTrueAndIdNotOrderByNomeAsc(Long unidadeId, Long idExcluido);
}
