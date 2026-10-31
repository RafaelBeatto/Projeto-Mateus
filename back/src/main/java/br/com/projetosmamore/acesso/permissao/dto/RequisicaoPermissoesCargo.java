package br.com.projetosmamore.acesso.permissao.dto;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Conjunto completo de permissões que o cargo deve ter nesta unidade. */
public record RequisicaoPermissoesCargo(@NotNull @Size(max = 100) Set<@NotBlank @Size(max = 60) String> permissoes) {
}
