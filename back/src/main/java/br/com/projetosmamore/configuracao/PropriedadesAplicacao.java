package br.com.projetosmamore.configuracao;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Configurações próprias da aplicação (prefixo "aplicacao" no application.properties). */
@Validated
@ConfigurationProperties(prefix = "aplicacao")
public record PropriedadesAplicacao(@Valid Jwt jwt, @Valid Cors cors, @Valid Armazenamento armazenamento,
        @Valid LimiteTentativas limiteTentativas, Dono dono, @NotBlank String fusoHorarioPadrao) {

    /**
     * Login(s) do dono do sistema: só eles abrem a tela "Administração do sistema".
     * Vem de variável de ambiente, nunca do banco: ninguém consegue se dar esse acesso pelas telas.
     */
    public record Dono(List<String> logins) {

        public boolean eh(String login) {
            return logins != null && login != null
                    && logins.stream().map(String::trim).anyMatch(dono -> !dono.isEmpty() && dono.equalsIgnoreCase(login));
        }
    }

    /** Máximo de chamadas por IP a cada minuto nas rotas públicas de autenticação. */
    public record LimiteTentativas(@Positive int entrarPorMinuto, @Positive int renovarPorMinuto) {
    }

    public record Jwt(
            @NotBlank @Size(min = 32) String segredo,
            @Positive long validadeAcessoMinutos,
            @Positive long validadeRenovacaoDias) {
    }

    public record Cors(@NotEmpty List<@NotBlank String> origensPermitidas) {
    }

    public record Armazenamento(
            @NotBlank String bucket,
            @NotBlank String regiao,
            String endpoint,
            String chaveAcesso,
            String chaveSecreta,
            @Positive long tamanhoMaximoMb,
            @Positive long validadeUrlMinutos) {

        public long tamanhoMaximoBytes() {
            return tamanhoMaximoMb * 1024 * 1024;
        }
    }
}
