import { useState } from 'react';
import { Box, Chip, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { IconId, IconKey, IconLogout, IconSearch, IconUserCheck, IconUserOff } from '@tabler/icons-react';
import TabelaResponsiva, { Coluna } from 'src/components/compartilhados/TabelaResponsiva';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoAdministracaoSistema } from 'src/servicos/administracaoSistema';
import { useSelector } from 'src/store/Store';
import type { FiltroSituacao, UsuarioSistema } from 'src/types/administracaoSistema';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarDataHora } from 'src/utils/formatacao';
import DialogoRedefinirSenha from '../usuarios/DialogoRedefinirSenha';
import FichaUsuario from './FichaUsuario';

const FILTROS: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ATIVOS', rotulo: 'Ativos' },
  { valor: 'DESATIVADOS', rotulo: 'Desativados' },
  { valor: 'SENHA_PROVISORIA', rotulo: 'Com senha provisória' },
];

const colunas: Coluna<UsuarioSistema>[] = [
  {
    titulo: 'Nome',
    principal: true,
    valor: (u) => (
      <Box>
        {u.nomeCompleto}
        {u.funcao ? (
          <Box component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.8rem' }}>
            {u.funcao}
          </Box>
        ) : null}
      </Box>
    ),
  },
  { titulo: 'Usuário', valor: (u) => u.login },
  { titulo: 'Unidade', valor: (u) => u.unidadeNome },
  { titulo: 'Cargo', valor: (u) => u.cargoNome },
  {
    titulo: 'Situação',
    valor: (u) => (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={u.ativo ? 'Ativo' : 'Desativado'} color={u.ativo ? 'success' : 'default'} />
        {u.conectado ? <Chip size="small" color="primary" label="Conectado" /> : null}
        {u.trocarSenha ? <Chip size="small" color="warning" label="Senha provisória" /> : null}
        {u.dono ? <Chip size="small" color="secondary" label="Dono" /> : null}
      </Stack>
    ),
  },
  { titulo: 'Último acesso', valor: (u) => formatarDataHora(u.ultimoAcessoEm) },
  { titulo: 'Cadastrado em', valor: (u) => formatarDataHora(u.criadoEm) },
];

/** Usuários de todas as unidades, sem a regra da hierarquia; a ficha mostra tudo sobre cada um. */
const AbaUsuarios = () => {
  const { notificar, confirmar } = useInteracao();
  const meuId = useSelector((s) => s.autenticacao.usuario?.id);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<FiltroSituacao>('TODOS');
  const [pagina, setPagina] = useState({ numero: 0, tamanho: 20 });
  const [senhaDe, setSenhaDe] = useState<UsuarioSistema | null>(null);
  const [fichaDe, setFichaDe] = useState<number | null>(null);

  const { dados, carregando, erro, recarregar } = useConsulta(
    () => servicoAdministracaoSistema.usuarios(busca, situacao, pagina.numero, pagina.tamanho),
    [busca, situacao, pagina],
  );

  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    try {
      await acao();
      notificar(sucesso);
      recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const alternarSituacao = async (u: UsuarioSistema) => {
    const texto = u.ativo
      ? `Desativar ${u.nomeCompleto} (${u.unidadeNome})? A pessoa perde o acesso na hora.`
      : `Reativar o acesso de ${u.nomeCompleto}?`;
    if (!(await confirmar(texto, { rotuloConfirmar: u.ativo ? 'Desativar' : 'Reativar', perigo: u.ativo }))) return;
    executar(() => servicoAdministracaoSistema.alterarSituacao(u.id, !u.ativo), u.ativo ? 'Usuário desativado.' : 'Usuário reativado.');
  };

  const desconectar = async (u: UsuarioSistema) => {
    if (!(await confirmar(`Desconectar ${u.nomeCompleto} de todos os aparelhos agora?`, { rotuloConfirmar: 'Desconectar', perigo: true }))) return;
    executar(() => servicoAdministracaoSistema.encerrarSessoes(u.id), 'Sessão encerrada.');
  };

  const reiniciarPagina = () => setPagina((p) => ({ ...p, numero: 0 }));

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          type="search"
          size="small"
          placeholder="Buscar por nome, usuário ou unidade"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            reiniciarPagina();
          }}
          InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
          inputProps={{ 'aria-label': 'Buscar usuário em todas as unidades' }}
          sx={{ width: { xs: '100%', sm: 360 } }}
        />
        <TextField
          select
          size="small"
          label="Situação"
          value={situacao}
          onChange={(e) => {
            setSituacao(e.target.value as FiltroSituacao);
            reiniciarPagina();
          }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          {FILTROS.map((f) => (
            <MenuItem key={f.valor} value={f.valor}>
              {f.rotulo}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TabelaResponsiva
        colunas={colunas}
        itens={dados?.itens}
        chave={(u) => u.id}
        carregando={carregando}
        erro={erro}
        vazio={busca || situacao !== 'TODOS' ? 'Nenhum usuário com esse filtro.' : 'Nenhum usuário cadastrado.'}
        paginacao={
          dados
            ? { pagina: dados.pagina, tamanho: dados.tamanho, total: dados.total, aoMudar: (numero, tamanho) => setPagina({ numero, tamanho }) }
            : undefined
        }
        acoes={(u) => (
          <MenuAcoes
            acoes={[
              { rotulo: 'Ver ficha completa', icone: <IconId size={18} />, aoClicar: () => setFichaDe(u.id) },
              { rotulo: 'Redefinir senha', icone: <IconKey size={18} />, aoClicar: () => setSenhaDe(u), oculta: u.id === meuId },
              { rotulo: 'Desconectar', icone: <IconLogout size={18} />, aoClicar: () => desconectar(u), oculta: u.id === meuId || !u.conectado },
              {
                rotulo: u.ativo ? 'Desativar' : 'Reativar',
                icone: u.ativo ? <IconUserOff size={18} /> : <IconUserCheck size={18} />,
                aoClicar: () => alternarSituacao(u),
                perigo: u.ativo,
                oculta: u.id === meuId,
              },
            ]}
          />
        )}
      />

      <FichaUsuario usuarioId={fichaDe} aoFechar={() => setFichaDe(null)} />
      <DialogoRedefinirSenha
        usuario={senhaDe}
        redefinir={servicoAdministracaoSistema.redefinirSenha}
        aoFechar={() => setSenhaDe(null)}
        aoSalvar={() => notificar('Senha redefinida.')}
      />
    </>
  );
};

export default AbaUsuarios;
