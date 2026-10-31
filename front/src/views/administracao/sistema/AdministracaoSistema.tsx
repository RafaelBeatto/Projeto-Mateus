import { useEffect, useState } from 'react';
import { AppBar, Box, Button, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { IconLogout, IconShieldLock } from '@tabler/icons-react';
import PageContainer from 'src/components/container/PageContainer';
import { useDispatch, useSelector } from 'src/store/Store';
import { carregarUnidades, sair } from 'src/store/autenticacao/AutenticacaoSlice';
import { TabelaUnidades } from '../unidades/Unidades';
import AbaEmpresas from './AbaEmpresas';
import AbaPainel from './AbaPainel';
import AbaSessoes from './AbaSessoes';
import AbaUsuarios from './AbaUsuarios';

const ABAS = [
  { rotulo: 'Painel', Tela: AbaPainel },
  { rotulo: 'Empresas', Tela: AbaEmpresas },
  { rotulo: 'Sessões ativas', Tela: AbaSessoes },
  { rotulo: 'Usuários', Tela: AbaUsuarios },
  { rotulo: 'Unidades', Tela: TabelaUnidades },
];

/**
 * Área exclusiva do dono do sistema (login em APAE_DONO_LOGINS no back), fora do layout do sistema:
 * quem entra com esse login cai direto aqui. O front só esconde; quem barra de verdade é o back (403).
 */
const AdministracaoSistema = () => {
  const dispatch = useDispatch();
  const usuario = useSelector((s) => s.autenticacao.usuario);
  const [aba, setAba] = useState(0);
  const { Tela } = ABAS[aba];

  // A aba Unidades usa a árvore do store (no sistema quem carrega é o seletor do cabeçalho).
  useEffect(() => {
    dispatch(carregarUnidades());
  }, [dispatch]);

  return (
    <PageContainer title="Administração do sistema · Mamoré Construções">
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <IconShieldLock size={24} />
          <Typography variant="h6" flexGrow={1} noWrap>
            Administração do sistema
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {usuario?.nomeCompleto}
          </Typography>
          <Button variant="outlined" startIcon={<IconLogout size={18} />} onClick={() => dispatch(sair())}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box borderBottom={1} borderColor="divider" mb={3}>
          <Tabs value={aba} onChange={(_, valor: number) => setAba(valor)} variant="scrollable" allowScrollButtonsMobile>
            {ABAS.map(({ rotulo }) => (
              <Tab key={rotulo} label={rotulo} />
            ))}
          </Tabs>
        </Box>
        <Tela />
      </Container>
    </PageContainer>
  );
};

export default AdministracaoSistema;
