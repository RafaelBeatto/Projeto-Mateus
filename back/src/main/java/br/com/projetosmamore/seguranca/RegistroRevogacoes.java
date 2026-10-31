package br.com.projetosmamore.seguranca;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Component;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import br.com.projetosmamore.configuracao.PropriedadesAplicacao;

/**
 * "Derrubar sessão" na hora: revogar o token de renovação não basta, porque o JWT de acesso
 * continua valendo até expirar. Aqui fica, por usuário, o instante da revogação; todo JWT emitido
 * até esse instante é recusado. O registro só precisa durar a validade do JWT de acesso.
 * Fica em memória: com várias instâncias, cada uma só conhece as revogações feitas nela
 * (nas demais o JWT antigo cai quando expira, e a renovação já está bloqueada no banco).
 */
@Component
public class RegistroRevogacoes {

    private final Cache<Long, Instant> revogadosEm;

    public RegistroRevogacoes(PropriedadesAplicacao propriedades) {
        this.revogadosEm = Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(propriedades.jwt().validadeAcessoMinutos() + 1))
                .maximumSize(100_000)
                .build();
    }

    public void revogar(Long usuarioId) {
        // O "iat" do JWT tem precisão de segundos.
        revogadosEm.put(usuarioId, Instant.now().truncatedTo(ChronoUnit.SECONDS));
    }

    public boolean revogado(Long usuarioId, Instant emitidoEm) {
        Instant revogacao = revogadosEm.getIfPresent(usuarioId);
        return revogacao != null && (emitidoEm == null || !emitidoEm.isAfter(revogacao));
    }
}
