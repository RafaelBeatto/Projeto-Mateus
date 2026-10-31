import { ReactNode } from 'react';
import { Grid, Box, Theme, ThemeProvider, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import logoMamore from 'src/assets/images/logos/logo-mamore.svg';

const VERDE_MAMORE = '#1a6b52';

/** O tema do sistema com o verde da Mamoré como cor principal: vale só dentro desta moldura. */
const temaMamore = (tema: Theme): Theme => ({
  ...tema,
  palette: {
    ...tema.palette,
    primary: { ...tema.palette.primary, main: VERDE_MAMORE, dark: '#155a44', light: '#e6f4ee', contrastText: '#fff' },
  },
});

/** Moldura das telas de entrar e trocar senha: marca da Mamoré no painel verde + formulário. */
const LayoutAutenticacao = ({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) => (
  <ThemeProvider theme={temaMamore}>
    <PageContainer title={`${titulo} · Mamoré Construções`} description={subtitulo}>
      <Grid container spacing={0} sx={{ overflowX: 'hidden', minHeight: '100vh' }}>
        <Grid
          item
          xs={12}
          lg={7}
          xl={8}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          px={3}
          py={{ xs: 5, lg: 0 }}
          bgcolor={VERDE_MAMORE}
        >
          <Box
            component="img"
            src={logoMamore}
            alt=""
            sx={{ width: { xs: 88, lg: 168 }, height: { xs: 88, lg: 168 }, filter: 'brightness(0) invert(1)' }}
          />
          <Typography
            component="div"
            variant="h2"
            fontWeight="700"
            color="#fff"
            mt={{ xs: 2, lg: 4 }}
            sx={{ fontSize: { xs: '1.5rem', lg: '2.5rem' } }}
          >
            Mamoré Construções
          </Typography>
          <Typography
            variant="subtitle2"
            mt={1}
            sx={{ color: 'rgba(255, 255, 255, 0.75)', letterSpacing: '0.2em', textTransform: 'uppercase' }}
          >
            e Meio Ambiente
          </Typography>
        </Grid>
        <Grid item xs={12} lg={5} xl={4} display="flex" justifyContent="center" alignItems="center">
          <Box p={{ xs: 3, sm: 4 }} width="100%" maxWidth={460}>
            <Typography fontWeight="700" variant="h3" mb={1}>
              {titulo}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" mb={1}>
              {subtitulo}
            </Typography>
            {children}
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  </ThemeProvider>
);

export default LayoutAutenticacao;
