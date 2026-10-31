package br.com.projetosmamore.seguranca;

import java.util.HashSet;
import java.util.Set;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.projetosmamore.acesso.permissao.PermissaoRepositorio;
import br.com.projetosmamore.acesso.permissao.Permissoes;
import br.com.projetosmamore.configuracao.PropriedadesAplicacao;
import br.com.projetosmamore.acesso.usuario.Usuario;
import br.com.projetosmamore.acesso.usuario.UsuarioRepositorio;
import br.com.projetosmamore.comum.excecao.NaoEncontradoExcecao;
import lombok.RequiredArgsConstructor;

/**
 * Carrega o usuário com as permissões efetivas (matriz padrão + ajustes da unidade).
 * Fica em cache para não consultar o banco a cada requisição; qualquer alteração
 * de usuário ou da matriz precisa chamar {@link #esquecer} ou {@link #esquecerTodos}.
 */
@Service
@RequiredArgsConstructor
public class ServicoUsuarioAutenticado {

    public static final String CACHE = "usuarios-autenticados";

    private final UsuarioRepositorio usuarios;
    private final PermissaoRepositorio permissoes;
    private final PropriedadesAplicacao propriedades;

    @Cacheable(cacheNames = CACHE, key = "#usuarioId")
    @Transactional(readOnly = true)
    public UsuarioAutenticado carregar(Long usuarioId) {
        Usuario usuario = usuarios.findComCargoEUnidadeById(usuarioId)
                .orElseThrow(() -> new NaoEncontradoExcecao("Usuário"));
        var cargo = usuario.getCargo();
        var unidade = usuario.getUnidade();
        Set<String> codigos = new HashSet<>(cargo.administradorSistema()
                ? permissoes.todosCodigos()
                : permissoes.codigosEfetivos(cargo.getId(), unidade.getId()));
        if (propriedades.dono() != null && propriedades.dono().eh(usuario.getLogin())) {
            codigos.add(Permissoes.CODIGO_DONO_SISTEMA);
        }
        return new UsuarioAutenticado(usuario.getId(), usuario.getLogin(), usuario.getNome(), usuario.nomeCompleto(),
                cargo.getId(), cargo.getCodigo(), cargo.getNome(), cargo.getNivel(),
                unidade.getId(), unidade.getNome(), unidade.getTipo(), unidade.getCaminho(),
                usuario.podeEntrar(), usuario.isTrocarSenha(), Set.copyOf(codigos));
    }

    @CacheEvict(cacheNames = CACHE, key = "#usuarioId")
    public void esquecer(Long usuarioId) {
        // Só remove do cache; o próximo acesso recarrega do banco.
    }

    @CacheEvict(cacheNames = CACHE, allEntries = true)
    public void esquecerTodos() {
        // Usado quando a matriz de permissões muda (afeta vários usuários de uma vez).
    }
}
