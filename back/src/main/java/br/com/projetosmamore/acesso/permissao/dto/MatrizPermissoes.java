package br.com.projetosmamore.acesso.permissao.dto;

import java.util.List;
import java.util.Set;

import br.com.projetosmamore.acesso.cargo.dto.CargoResposta;

/**
 * Matriz cargo × permissão de uma unidade, pronta para a tela.
 * "ajustadas" = permissões em que a unidade difere da matriz padrão.
 */
public record MatrizPermissoes(Long unidadeId, List<PermissaoResposta> permissoes, List<LinhaCargo> cargos) {

    public record PermissaoResposta(String codigo, String modulo, String descricao) {
    }

    public record LinhaCargo(CargoResposta cargo, boolean editavel, Set<String> permissoes, Set<String> ajustadas) {
    }
}
