package br.com.projetosmamore.acesso.autenticacao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequisicaoRenovar(@NotBlank @Size(max = 100) String tokenRenovacao) {
}
