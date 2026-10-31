package br.com.projetosmamore.sistema.administracao;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import br.com.projetosmamore.acesso.cargo.Cargo;
import br.com.projetosmamore.sistema.administracao.dto.EmpresaSistema;
import br.com.projetosmamore.sistema.administracao.dto.FichaUsuario;
import br.com.projetosmamore.sistema.administracao.dto.PainelSistema;
import br.com.projetosmamore.sistema.administracao.dto.SessaoAtiva;
import lombok.RequiredArgsConstructor;

/**
 * Consultas do sistema inteiro, sem filtro de unidade: só a tela do dono usa.
 * SQL direto porque juntam tabelas de vários módulos só para contar.
 */
@Component
@RequiredArgsConstructor
class ConsultasAdministracao {

    private final JdbcTemplate jdbc;

    PainelSistema.Contagens contagens() {
        return jdbc.queryForObject("""
                select (select count(*) from acesso.unidade)                                        as unidades,
                       (select count(*) from acesso.unidade where ativo)                            as unidades_ativas,
                       (select count(*) from acesso.usuario)                                        as usuarios,
                       (select count(*) from acesso.usuario where ativo)                            as usuarios_ativos,
                       (select count(*) from acesso.usuario where ativo and trocar_senha)           as trocar_senha,
                       (select count(*) from acesso.usuario where ultimo_acesso_em > now() - interval '24 hours') as acessos_24h,
                       (select count(distinct usuario_id) from acesso.token_renovacao
                         where not revogado and expira_em > now())                                  as com_sessao,
                       (select count(*) from gestao_projetos.projeto where excluido_em is null)     as projetos,
                       (select count(*) from sistema.arquivo)                                       as arquivos,
                       (select coalesce(sum(tamanho_bytes), 0) from sistema.arquivo)                as arquivos_bytes
                """, (rs, linha) -> new PainelSistema.Contagens(
                rs.getLong("unidades"), rs.getLong("unidades_ativas"), rs.getLong("usuarios"),
                rs.getLong("usuarios_ativos"), rs.getLong("trocar_senha"), rs.getLong("acessos_24h"),
                rs.getLong("com_sessao"), rs.getLong("projetos"), rs.getLong("arquivos"), rs.getLong("arquivos_bytes")));
    }

    PainelSistema.Banco banco() {
        return jdbc.queryForObject("select current_setting('server_version') as versao, pg_database_size(current_database()) as tamanho",
                (rs, linha) -> new PainelSistema.Banco("PostgreSQL " + rs.getString("versao"), rs.getLong("tamanho")));
    }

    List<SessaoAtiva> sessoesAtivas() {
        return jdbc.query("""
                select u.id, u.login, u.nome, c.nome as cargo, un.nome as unidade,
                       count(*) as sessoes, max(t.criado_em) as ultima_entrada, max(t.expira_em) as expira_em
                  from acesso.token_renovacao t
                  join acesso.usuario u  on u.id = t.usuario_id
                  join acesso.cargo c    on c.id = u.cargo_id
                  join acesso.unidade un on un.id = u.unidade_id
                 where not t.revogado and t.expira_em > now()
                 group by u.id, u.login, u.nome, c.nome, un.nome
                 order by max(t.criado_em) desc
                """, (rs, linha) -> new SessaoAtiva(rs.getLong("id"), rs.getString("login"), rs.getString("nome"),
                rs.getString("cargo"), rs.getString("unidade"), rs.getLong("sessoes"),
                instante(rs, "ultima_entrada"), instante(rs, "expira_em")));
    }

    /** Ids de quem tem sessão aberta agora (para marcar "conectado" na lista). */
    Set<Long> usuariosConectados() {
        return Set.copyOf(jdbc.queryForList(
                "select distinct usuario_id from acesso.token_renovacao where not revogado and expira_em > now()", Long.class));
    }

    String nomeDoUsuario(Long id) {
        return id == null ? null
                : jdbc.query("select nome from acesso.usuario where id = ?", (rs, linha) -> rs.getString(1), id)
                        .stream().findFirst().orElse(null);
    }

    FichaUsuario.Sessoes sessoes(Long usuarioId) {
        return jdbc.queryForObject("""
                select count(*) as abertas, max(criado_em) as ultima_entrada, max(expira_em) as expira_em
                  from acesso.token_renovacao
                 where usuario_id = ? and not revogado and expira_em > now()
                """, (rs, linha) -> new FichaUsuario.Sessoes(rs.getLong("abertas"), instante(rs, "ultima_entrada"),
                instante(rs, "expira_em")), usuarioId);
    }

    FichaUsuario.Trabalho trabalho(Long usuarioId) {
        return jdbc.queryForObject("""
                with alvo as (select ?::bigint as id)
                select (select count(*) from gestao_projetos.projeto_coordenador c
                          join gestao_projetos.projeto p on p.id = c.projeto_id
                         where c.usuario_id = (select id from alvo) and p.excluido_em is null)             as projetos,
                       (select count(*) from gestao_projetos.projeto_etapa
                         where responsavel_id = (select id from alvo))                                     as etapas,
                       (select count(*) from gestao_projetos.projeto_etapa
                         where responsavel_id = (select id from alvo) and status <> 'CONCLUIDO')           as etapas_abertas,
                       (select count(*) from gestao_projetos.etapa_tarefa
                         where responsavel_id = (select id from alvo))                                     as tarefas,
                       (select count(*) from gestao_projetos.etapa_tarefa
                         where responsavel_id = (select id from alvo) and status <> 'CONCLUIDA')           as tarefas_abertas,
                       (select count(*) from gestao_projetos.projeto_mensagem
                         where remetente_id = (select id from alvo))                                       as mensagens,
                       (select count(*) from sistema.arquivo where enviado_por_id = (select id from alvo)) as arquivos,
                       (select coalesce(sum(tamanho_bytes), 0) from sistema.arquivo
                         where enviado_por_id = (select id from alvo))                                     as arquivos_bytes
                """, (rs, linha) -> new FichaUsuario.Trabalho(rs.getLong("projetos"), rs.getLong("etapas"),
                rs.getLong("etapas_abertas"), rs.getLong("tarefas"), rs.getLong("tarefas_abertas"),
                rs.getLong("mensagens"), rs.getLong("arquivos"), rs.getLong("arquivos_bytes")), usuarioId);
    }

    FichaUsuario.Atividade atividade(Long usuarioId) {
        var porModulo = jdbc.query("""
                select modulo, count(*) as quantidade from sistema.historico
                 where usuario_id = ? group by modulo order by quantidade desc
                """, (rs, linha) -> new FichaUsuario.PorModulo(rs.getString("modulo"), rs.getLong("quantidade")), usuarioId);
        var ultimas = jdbc.query("""
                select h.id, h.modulo, h.acao, h.descricao, un.nome as unidade, h.criado_em
                  from sistema.historico h
                  join acesso.unidade un on un.id = h.unidade_id
                 where h.usuario_id = ?
                 order by h.criado_em desc, h.id desc
                 limit 30
                """, (rs, linha) -> new FichaUsuario.Acao(rs.getLong("id"), rs.getString("modulo"), rs.getString("acao"),
                rs.getString("descricao"), rs.getString("unidade"), instante(rs, "criado_em")), usuarioId);
        return jdbc.queryForObject("""
                select count(*) as total,
                       count(*) filter (where criado_em > now() - interval '30 days') as ultimos_30,
                       max(criado_em) as ultima
                  from sistema.historico where usuario_id = ?
                """, (rs, linha) -> new FichaUsuario.Atividade(rs.getLong("total"), rs.getLong("ultimos_30"),
                instante(rs, "ultima"), porModulo, ultimas), usuarioId);
    }

    /**
     * Empresas (unidades raiz), menos a do próprio dono. O administrador mostrado é o primeiro
     * cadastrado com o cargo Administrador na unidade raiz (o que foi criado junto com a empresa).
     */
    List<EmpresaSistema> empresas(Long unidadeDoDono) {
        return jdbc.query("""
                select r.id, r.nome, r.cnpj, r.ativo, r.criado_em,
                       adm.id as adm_id, adm.login as adm_login, adm.nome as adm_nome,
                       (select count(*) from acesso.unidade un where un.caminho like r.caminho || '%') as unidades,
                       (select count(*) from acesso.usuario u join acesso.unidade un on un.id = u.unidade_id
                         where un.caminho like r.caminho || '%')                                       as usuarios,
                       (select count(*) from acesso.usuario u join acesso.unidade un on un.id = u.unidade_id
                         where un.caminho like r.caminho || '%' and u.ativo)                           as usuarios_ativos
                  from acesso.unidade r
                  left join lateral (select u.id, u.login, u.nome from acesso.usuario u
                                       join acesso.cargo c on c.id = u.cargo_id
                                      where u.unidade_id = r.id and c.codigo = ?
                                      order by u.id limit 1) adm on true
                 where r.unidade_pai_id is null and r.id <> ?
                 order by lower(r.nome)
                """, (rs, linha) -> new EmpresaSistema(rs.getLong("id"), rs.getString("nome"), rs.getString("cnpj"),
                rs.getBoolean("ativo"), instante(rs, "criado_em"), rs.getObject("adm_id", Long.class),
                rs.getString("adm_login"), rs.getString("adm_nome"), rs.getLong("unidades"), rs.getLong("usuarios"),
                rs.getLong("usuarios_ativos")), Cargo.ADMINISTRADOR, unidadeDoDono);
    }

    private static Instant instante(ResultSet rs, String coluna) throws SQLException {
        OffsetDateTime valor = rs.getObject(coluna, OffsetDateTime.class);
        return valor == null ? null : valor.toInstant();
    }
}
