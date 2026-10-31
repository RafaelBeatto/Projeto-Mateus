import { Box, ButtonBase, Grid, Stack, Typography } from '@mui/material';
import { IconCheck, IconMoon, IconMoonStars, IconSun } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import DashboardCard from 'src/components/shared/DashboardCard';
import { PERMISSOES } from 'src/constantes/permissoes';
import { usePermissao } from 'src/hooks/usePermissao';
import { useDispatch, useSelector } from 'src/store/Store';
import { ModoCor, setDarkMode } from 'src/store/customizer/CustomizerSlice';
import SecaoPermissoes from './SecaoPermissoes';

/** Cores só da miniatura de cada opção (fundo, cartão e linhas de texto). */
const OPCOES_MODO: {
  modo: ModoCor;
  titulo: string;
  descricao: string;
  icone: typeof IconSun;
  amostra: { fundo: string; cartao: string; linha: string };
}[] = [
  {
    modo: 'light',
    titulo: 'Claro',
    descricao: 'Fundo branco, ideal para ambientes iluminados',
    icone: IconSun,
    amostra: { fundo: '#F2F6FA', cartao: '#FFFFFF', linha: '#DFE5EF' },
  },
  {
    modo: 'dark',
    titulo: 'Noturno',
    descricao: 'Tons de azul-escuro, mais confortável à noite',
    icone: IconMoon,
    amostra: { fundo: '#171c23', cartao: '#2A3447', linha: '#465670' },
  },
  {
    modo: 'black',
    titulo: 'Noturno black',
    descricao: 'Noturno mais escuro, com fundo preto',
    icone: IconMoonStars,
    amostra: { fundo: '#000000', cartao: '#0E0E0E', linha: '#2A2A2A' },
  },
];

const Configuracoes = () => {
  const modoAtual = useSelector((s) => s.customizer.activeMode);
  const dispatch = useDispatch();
  const { tem } = usePermissao();

  return (
    <Pagina>
      <DashboardCard title="Modo de cor" subtitle="Fica salvo neste navegador">
        <Grid container spacing={3}>
          {OPCOES_MODO.map(({ modo, titulo, descricao, icone: Icone, amostra }) => {
            const ativo = modoAtual === modo;
            return (
              <Grid item xs={12} sm={4} key={modo}>
                <ButtonBase
                  onClick={() => dispatch(setDarkMode(modo))}
                  aria-pressed={ativo}
                  sx={{
                    width: '100%',
                    display: 'block',
                    textAlign: 'left',
                    borderRadius: 2,
                    border: 2,
                    borderColor: ativo ? 'primary.main' : 'divider',
                    p: 2,
                  }}
                >
                  <Box sx={{ bgcolor: amostra.fundo, borderRadius: 1, p: 1.5, mb: 2 }}>
                    <Box sx={{ bgcolor: amostra.cartao, borderRadius: 1, p: 1.5 }}>
                      <Box sx={{ bgcolor: '#5D87FF', height: 8, width: '40%', borderRadius: 1, mb: 1 }} />
                      <Box sx={{ bgcolor: amostra.linha, height: 6, width: '80%', borderRadius: 1, mb: 0.75 }} />
                      <Box sx={{ bgcolor: amostra.linha, height: 6, width: '60%', borderRadius: 1 }} />
                    </Box>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Icone size={18} />
                    <Typography variant="subtitle1" fontWeight={600} flexGrow={1}>
                      {titulo}
                    </Typography>
                    {ativo && <IconCheck size={18} color="currentColor" />}
                  </Stack>
                  <Typography variant="body2" color="textSecondary" mt={0.5}>
                    {descricao}
                  </Typography>
                </ButtonBase>
              </Grid>
            );
          })}
        </Grid>
      </DashboardCard>
      {tem(PERMISSOES.PERMISSAO_LER) ? (
        <Box mt={3}>
          <SecaoPermissoes />
        </Box>
      ) : null}
    </Pagina>
  );
};

export default Configuracoes;
