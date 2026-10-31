import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { IconLogout, IconRefresh } from '@tabler/icons-react';
import TabelaResponsiva, { Coluna } from 'src/components/compartilhados/TabelaResponsiva';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoAdministracaoSistema } from 'src/servicos/administracaoSistema';
import { useSelector } from 'src/store/Store';
import type { SessaoAtiva } from 'src/types/administracaoSistema';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarDataHora } from 'src/utils/formatacao';

/** Quem está com sessão aberta em qualquer unidade; derruba uma pessoa ou todas (menos você). */
const AbaSessoes = () => {
  const { notificar, confirmar } = useInteracao();
  const meuId = useSelector((s) => s.autenticacao.usuario?.id);
  const { dados, carregando, erro, recarregar } = useConsulta(() => servicoAdministracaoSistema.sessoes());

  const colunas: Coluna<SessaoAtiva>[] = [
    {
      titulo: 'Nome',
      principal: true,
      valor: (s) => (
        <>
          {s.nome}
          {s.usuarioId === meuId ? <Chip size="small" label="você" sx={{ ml: 1 }} /> : null}
        </>
      ),
    },
    { titulo: 'Usuário', valor: (s) => s.login },
    { titulo: 'Unidade', valor: (s) => s.unidadeNome },
    { titulo: 'Cargo', valor: (s) => s.cargoNome },
    { titulo: 'Aparelhos', valor: (s) => s.sessoes, alinhamento: 'center' },
    { titulo: 'Última entrada', valor: (s) => formatarDataHora(s.ultimaEntrada) },
  ];

  const encerrar = async (s: SessaoAtiva) => {
    if (!(await confirmar(`Desconectar ${s.nome} de todos os aparelhos agora?`, { rotuloConfirmar: 'Desconectar', perigo: true }))) return;
    try {
      await servicoAdministracaoSistema.encerrarSessoes(s.usuarioId);
      notificar('Sessão encerrada.');
      recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const encerrarTodas = async () => {
    if (!(await confirmar('Desconectar TODOS os usuários (menos você)? Cada um precisará entrar de novo.', { rotuloConfirmar: 'Desconectar todos', perigo: true }))) return;
    try {
      const total = await servicoAdministracaoSistema.encerrarTodasAsSessoes();
      notificar(`${total} usuário(s) desconectado(s).`);
      recarregar();
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems={{ sm: 'center' }}>
        <Typography color="textSecondary">
          Sessões abertas em todas as unidades. Desconectar vale na hora e obriga a pessoa a entrar de novo.
        </Typography>
        <Box flexGrow={1} />
        <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={recarregar} disabled={carregando}>
          Atualizar
        </Button>
        <Button variant="contained" color="error" startIcon={<IconLogout size={18} />} onClick={encerrarTodas}>
          Desconectar todos
        </Button>
      </Stack>

      <TabelaResponsiva
        colunas={colunas}
        itens={dados}
        chave={(s) => s.usuarioId}
        carregando={carregando}
        erro={erro}
        vazio="Ninguém conectado."
        acoes={(s) => (
          <MenuAcoes
            acoes={[
              { rotulo: 'Desconectar', icone: <IconLogout size={18} />, aoClicar: () => encerrar(s), perigo: true, oculta: s.usuarioId === meuId },
            ]}
          />
        )}
      />
    </>
  );
};

export default AbaSessoes;
