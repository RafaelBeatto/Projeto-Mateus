import { ReactNode, useState } from 'react';
import { Alert, Box, Grid, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import CartaoGestaoProjeto from './CartaoGestaoProjeto';
import type { Acao } from 'src/components/compartilhados/MenuAcoes';
import type { GestaoProjeto } from 'src/types/gestaoProjetos';
import { normalizar } from 'src/utils/formatacao';
import { textoDeBuscaDoProjeto } from 'src/utils/gestaoProjetos';

/** Busca + grade de cartões dos projetos fora do Kanban, com uma linha de detalhe (data) sob cada cartão. */
const ListaProjetosGuardados = ({
  projetos,
  carregando,
  erro,
  rotuloBusca,
  vazio,
  detalhe,
  acoes,
  aoAbrir,
  extra,
}: {
  projetos: GestaoProjeto[] | undefined;
  carregando: boolean;
  erro: string | null;
  /** "nos arquivados", "na lixeira". */
  rotuloBusca: string;
  vazio: string;
  detalhe: (p: GestaoProjeto) => string;
  acoes: (p: GestaoProjeto) => Acao[];
  aoAbrir: (p: GestaoProjeto) => void;
  /** Ao lado da busca (ex.: "Esvaziar lixeira"). */
  extra?: ReactNode;
}) => {
  const [busca, setBusca] = useState('');
  const todos = projetos ?? [];
  const q = normalizar(busca);
  const visiveis = q
    ? todos.filter((p) => normalizar(textoDeBuscaDoProjeto(p)).includes(q))
    : todos;

  return (
    <>
      {todos.length ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          mb={2}
        >
          <TextField
            type="search"
            size="small"
            placeholder={`Buscar ${rotuloBusca}… (nome, processo, contratante, coordenador)`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            inputProps={{ 'aria-label': `Buscar ${rotuloBusca}` }}
            sx={{ width: { xs: '100%', sm: 420 } }}
          />
          {extra}
        </Stack>
      ) : null}
      {carregando && !projetos ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {projetos && !todos.length ? (
        <Typography color="textSecondary" textAlign="center" mt={2}>
          {vazio}
        </Typography>
      ) : null}
      {todos.length > 0 && !visiveis.length ? (
        <Typography color="textSecondary" textAlign="center" mt={2}>
          Nenhum projeto com essa busca.
        </Typography>
      ) : null}

      <Grid container spacing={2}>
        {visiveis.map((p) => (
          <Grid item xs={12} sm={6} lg={4} key={p.id}>
            <CartaoGestaoProjeto
              projeto={p}
              aoAbrir={() => aoAbrir(p)}
              acoes={[{ rotulo: 'Abrir', aoClicar: () => aoAbrir(p) }, ...acoes(p)]}
            />
            <Box px={0.5} pt={0.5}>
              <Typography variant="caption" color="textSecondary">
                {detalhe(p)}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default ListaProjetosGuardados;
