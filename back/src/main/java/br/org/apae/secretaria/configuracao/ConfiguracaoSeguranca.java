package br.org.apae.secretaria.configuracao;

import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ContentSecurityPolicyHeaderWriter;
import org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import br.org.apae.secretaria.comum.Relogio;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.ConversorJwtAutenticacao;
import br.org.apae.secretaria.seguranca.FiltroLimiteTentativas;
import br.org.apae.secretaria.seguranca.ServicoToken;

/**
 * API sem sessão: toda requisição traz o JWT no cabeçalho Authorization.
 * As permissões de cada rota ficam nos controladores (@PreAuthorize).
 */
@Configuration
@EnableMethodSecurity
public class ConfiguracaoSeguranca {

    private static final String[] ROTAS_PUBLICAS = {
        "/api/autenticacao/entrar", "/api/autenticacao/renovar", "/api/autenticacao/sair",
        // Só existe com o armazenamento local de desenvolvimento (link assinado, igual ao do S3).
        "/api/arquivos-locais/**"
    };

    /** Health check do Load Balancer: só devolve UP/DOWN (detalhes desligados no application.properties). */
    private static final String[] ROTAS_SAUDE = { "/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness" };

    /** A API só devolve JSON: nada pode ser carregado nem embutido a partir das respostas dela. */
    private static final String POLITICA_CONTEUDO = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    @Bean
    SecurityFilterChain cadeiaSeguranca(HttpSecurity http, ConversorJwtAutenticacao conversor,
            PropriedadesAplicacao propriedades) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> { })
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .headers(cabecalhos -> cabecalhos
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                        .referrerPolicy(r -> r.policy(ReferrerPolicy.NO_REFERRER))
                        // Só é enviado em HTTPS (atrás do ALB, via X-Forwarded-Proto).
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                        // O arquivo local (só desenvolvimento) abre no navegador: não pode levar a política da API.
                        .addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(
                                requisicao -> !requisicao.getRequestURI().startsWith("/api/arquivos-locais/"),
                                new ContentSecurityPolicyHeaderWriter(POLITICA_CONTEUDO))))
                .authorizeHttpRequests(regras -> regras
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, ROTAS_SAUDE).permitAll()
                        .requestMatchers(ROTAS_PUBLICAS).permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll())
                .addFilterAfter(new FiltroLimiteTentativas(propriedades.limiteTentativas()), CorsFilter.class)
                .oauth2ResourceServer(o -> o.jwt(jwt -> jwt.jwtAuthenticationConverter(conversor)))
                .build();
    }

    @Bean
    PasswordEncoder codificadorSenha() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecretKey chaveJwt(PropriedadesAplicacao propriedades) {
        return new SecretKeySpec(propriedades.jwt().segredo().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder codificadorJwt(SecretKey chaveJwt) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(chaveJwt));
    }

    @Bean
    JwtDecoder decodificadorJwt(SecretKey chaveJwt) {
        NimbusJwtDecoder decodificador = NimbusJwtDecoder.withSecretKey(chaveJwt).macAlgorithm(MacAlgorithm.HS256).build();
        decodificador.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(ServicoToken.EMISSOR)));
        return decodificador;
    }

    @Bean
    CorsConfigurationSource origensCors(PropriedadesAplicacao propriedades) {
        List<String> origens = propriedades.cors().origensPermitidas().stream().map(String::trim).toList();
        if (origens.stream().anyMatch(origem -> origem.contains("*"))) {
            throw new IllegalStateException("aplicacao.cors.origens-permitidas não aceita curinga (*): liste as origens do front.");
        }
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(origens);
        cors.setAllowCredentials(false);
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", ContextoSeguranca.CABECALHO_UNIDADE, Relogio.CABECALHO_FUSO));
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
        fonte.registerCorsConfiguration("/**", cors);
        return fonte;
    }
}
