package br.com.projetosmamore.sistema.administracao.dto;

import java.time.Instant;

/**
 * Empresa (unidade raiz) na tela do dono, com o administrador criado junto com ela
 * e quantas pessoas ela tem em todas as suas unidades.
 */
public record EmpresaSistema(Long id, String nome, String cnpj, boolean ativo, Instant criadoEm,
        Long administradorId, String administradorLogin, String administradorNome,
        long unidades, long usuarios, long usuariosAtivos) {
}
