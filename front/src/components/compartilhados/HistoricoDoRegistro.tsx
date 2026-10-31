import { useEffect, useState } from 'react';
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { BotaoFiltros, PainelFiltros } from './Filtros';
import type { HistoricoRegistro } from 'src/types/comum';
import { normalizar } from 'src/utils/formatacao';
import {
  ROTULO_ACAO_HISTORICO,
  agruparPorDia,
  diaLocalHistorico as diaLocal,
  horaHistorico,
  tituloDoDiaHistorico,
} from 'src/utils/historico';

const FILTRO_VAZIO = { busca: '', usuario: '', de: '', ate: '' };

/**
 * "Histórico" no fim do painel de detalhe de qualquer registro, separado por dia (hora, o que foi feito, quem e o tipo de ação).
 * "versao" força recarregar depois de uma alteração; "comFiltros" põe um ícone de filtro que abre busca, pessoa e período.
 */
const HistoricoDoRegistro = ({
  carregar,
  versao,
  comFiltros,
}: {
  carregar: () => Promise<HistoricoRegistro[]>;
  versao?: unknown;
  comFiltros?: boolean;
}) => {
  const [itens, setItens] = useState<HistoricoRegistro[] | null>(null);
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregar()
      .then((lista) => ativo && setItens(lista))
      .catch(() => ativo && setItens([]));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  const usuarios = [
    ...new Set((itens ?? []).map((i) => i.usuarioNome).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const q = normalizar(filtro.busca);
  const visiveis = (itens ?? []).filter((i) => {
    const dia = diaLocal(i.criadoEm);
    return (
      (!q || normalizar(i.descricao).includes(q)) &&
      (!filtro.usuario || i.usuarioNome === filtro.usuario) &&
      (!filtro.de || dia >= filtro.de) &&
      (!filtro.ate || dia <= filtro.ate)
    );
  });
  const temFiltro = Object.values(filtro).some(Boolean);

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} mt={3} mb={1}>
        <Typography variant="h6">Histórico</Typography>
        {comFiltros && itens?.length ? (
          <BotaoFiltros
            aberto={filtrosAbertos}
            ativo={temFiltro}
            aoAlternar={() => setFiltrosAbertos((v) => !v)}
            rotulo="Filtros do histórico"
          />
        ) : null}
      </Stack>
      {comFiltros && itens?.length ? (
        <PainelFiltros aberto={filtrosAbertos}>
          <TextField
            type="search"
            size="small"
            placeholder="Buscar no histórico…"
            value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
            inputProps={{ 'aria-label': 'Buscar no histórico' }}
            sx={{ flexGrow: 1, minWidth: { sm: 220 } }}
          />
          {usuarios.length ? (
            <TextField
              select
              size="small"
              value={filtro.usuario}
              onChange={(e) => setFiltro({ ...filtro, usuario: e.target.value })}
              SelectProps={{ displayEmpty: true }}
              inputProps={{ 'aria-label': 'Pessoa' }}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Todas as pessoas</MenuItem>
              {usuarios.map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            type="date"
            size="small"
            label="De"
            value={filtro.de}
            onChange={(e) => setFiltro({ ...filtro, de: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label="Até"
            value={filtro.ate}
            onChange={(e) => setFiltro({ ...filtro, ate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          {temFiltro ? (
            <Button variant="text" onClick={() => setFiltro(FILTRO_VAZIO)} sx={{ flexShrink: 0 }}>
              Limpar filtros
            </Button>
          ) : null}
        </PainelFiltros>
      ) : null}
      {itens && !itens.length ? (
        <Typography variant="body2" color="textSecondary">
          Sem registros ainda.
        </Typography>
      ) : itens?.length && !visiveis.length ? (
        <Typography variant="body2" color="textSecondary">
          Nenhum registro com esses filtros.
        </Typography>
      ) : (
        agruparPorDia(visiveis).map((g) => (
          <Box key={g.dia} mb={2}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              py={0.75}
              mb={0.5}
              borderBottom={1}
              borderColor="divider"
            >
              <Typography variant="subtitle2" fontWeight={600}>
                {tituloDoDiaHistorico(g.dia)}
              </Typography>
              <Chip size="small" label={g.itens.length} />
            </Stack>
            {g.itens.map((item) => (
              <Stack key={item.id} direction="row" spacing={1.5} alignItems="flex-start" py={0.75}>
                <Typography variant="body2" color="textSecondary" sx={{ minWidth: 42 }}>
                  {horaHistorico(item.criadoEm)}
                </Typography>
                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                    {item.descricao}
                  </Typography>
                  {item.usuarioNome ? (
                    <Typography variant="caption" color="textSecondary">
                      {item.usuarioNome}
                    </Typography>
                  ) : null}
                </Box>
                <Chip
                  size="small"
                  variant="outlined"
                  label={ROTULO_ACAO_HISTORICO[item.acao] ?? item.acao}
                />
              </Stack>
            ))}
          </Box>
        ))
      )}
    </>
  );
};

export default HistoricoDoRegistro;
