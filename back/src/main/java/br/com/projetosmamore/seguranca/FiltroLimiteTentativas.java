package br.com.projetosmamore.seguranca;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import br.com.projetosmamore.configuracao.PropriedadesAplicacao;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Freia força bruta nas rotas públicas de autenticação: cada IP tem um número de chamadas
 * por minuto (janela fixa, contada a partir da primeira). Passou do limite, responde 429.
 * O IP é o do cliente mesmo atrás do Load Balancer (server.forward-headers-strategy=native).
 * Fica dentro da cadeia do Spring Security, depois do CORS, para o 429 chegar legível ao front.
 * Contagem em memória: com várias instâncias, o limite vale por instância.
 */
public class FiltroLimiteTentativas extends OncePerRequestFilter {

    private static final Duration JANELA = Duration.ofMinutes(1);
    private static final String RESPOSTA = """
            {"type":"about:blank","title":"Too Many Requests","status":429,\
            "detail":"Muitas tentativas seguidas. Aguarde um minuto e tente novamente."}""";

    private final Map<String, Integer> limitePorRota;
    private final Cache<String, AtomicInteger> tentativas = Caffeine.newBuilder()
            .expireAfterWrite(JANELA)
            .maximumSize(100_000)
            .build();

    public FiltroLimiteTentativas(PropriedadesAplicacao.LimiteTentativas limites) {
        this.limitePorRota = Map.of(
                "/api/autenticacao/entrar", limites.entrarPorMinuto(),
                "/api/autenticacao/renovar", limites.renovarPorMinuto(),
                "/api/autenticacao/sair", limites.renovarPorMinuto());
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest requisicao) {
        return !HttpMethod.POST.matches(requisicao.getMethod()) || !limitePorRota.containsKey(rota(requisicao));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
            throws ServletException, IOException {
        String rota = rota(requisicao);
        int feitas = tentativas.get(rota + "|" + requisicao.getRemoteAddr(), chave -> new AtomicInteger())
                .incrementAndGet();
        if (feitas > limitePorRota.get(rota)) {
            resposta.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            resposta.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(JANELA.toSeconds()));
            resposta.setContentType("application/problem+json");
            resposta.setCharacterEncoding("UTF-8");
            resposta.getWriter().write(RESPOSTA);
            return;
        }
        cadeia.doFilter(requisicao, resposta);
    }

    /** Caminho já decodificado, igual ao que o Spring usa para achar a rota: "entr%61r" não pode escapar do limite. */
    private static String rota(HttpServletRequest requisicao) {
        return requisicao.getServletPath();
    }
}
