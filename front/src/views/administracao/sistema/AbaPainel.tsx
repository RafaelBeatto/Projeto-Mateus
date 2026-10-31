import { Alert, Box, Button, Card, CardContent, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';
import DashboardCard from 'src/components/shared/DashboardCard';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoAdministracaoSistema } from 'src/servicos/administracaoSistema';
import { formatarDataHora } from 'src/utils/formatacao';
import { tamanhoEmBytes } from './formatacaoAdministracao';

const numero = new Intl.NumberFormat('pt-BR');

const Indicador = ({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="body2" color="textSecondary">
        {titulo}
      </Typography>
      <Typography variant="h3" mt={1}>
        {valor}
      </Typography>
      {detalhe ? (
        <Typography variant="body2" color="textSecondary" mt={0.5}>
          {detalhe}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);

const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2} py={0.75} borderBottom={1} borderColor="divider">
    <Typography color="textSecondary">{rotulo}</Typography>
    <Typography fontWeight={600} textAlign="right">
      {valor}
    </Typography>
  </Stack>
);

/** Números do sistema inteiro (todas as unidades) e a situação do back e do banco. */
const AbaPainel = () => {
  const { dados, carregando, erro, recarregar } = useConsulta(() => servicoAdministracaoSistema.painel());

  if (erro) return <Alert severity="error">{erro}</Alert>;
  if (!dados) return <LinearProgress />;
  const { contagens: c, aplicacao: app, banco } = dados;

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={recarregar} disabled={carregando}>
          Atualizar
        </Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <Indicador titulo="Unidades" valor={numero.format(c.unidades)} detalhe={`${numero.format(c.unidadesAtivas)} ativas`} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Indicador
            titulo="Usuários"
            valor={numero.format(c.usuarios)}
            detalhe={`${numero.format(c.usuariosAtivos)} ativos · ${numero.format(c.usuariosTrocarSenha)} com senha provisória`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Indicador
            titulo="Conectados agora"
            valor={numero.format(c.usuariosComSessao)}
            detalhe={`${numero.format(c.acessosUltimas24h)} entraram nas últimas 24h`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Indicador
            titulo="Projetos e arquivos"
            valor={numero.format(c.projetos)}
            detalhe={`${numero.format(c.arquivos)} arquivos · ${tamanhoEmBytes(c.arquivosBytes)}`}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DashboardCard title="Aplicação">
            <Box>
              <Linha rotulo="Versão" valor={app.versao} />
              <Linha rotulo="Perfil" valor={app.perfis.join(', ') || 'local'} />
              <Linha rotulo="Java" valor={app.java} />
              <Linha rotulo="No ar desde" valor={formatarDataHora(app.iniciadaEm)} />
              <Linha rotulo="Memória" valor={`${numero.format(app.memoriaUsadaMb)} de ${numero.format(app.memoriaMaximaMb)} MB`} />
              <Linha rotulo="Arquivos em" valor={app.armazenamento} />
            </Box>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <DashboardCard title="Banco de dados">
            <Box>
              <Linha rotulo="Servidor" valor={banco.versao} />
              <Linha rotulo="Tamanho" valor={tamanhoEmBytes(banco.tamanhoBytes)} />
            </Box>
          </DashboardCard>
        </Grid>
      </Grid>
    </>
  );
};

export default AbaPainel;
