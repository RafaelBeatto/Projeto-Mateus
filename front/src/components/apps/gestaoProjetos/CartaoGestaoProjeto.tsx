import { Avatar, Box, Divider, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { IconCalendarEvent, IconFileText } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import MenuAcoes, { Acao } from 'src/components/compartilhados/MenuAcoes';
import type { GestaoProjeto } from 'src/types/gestaoProjetos';
import { formatarData, iniciais } from 'src/utils/formatacao';
import { prazoDoProjeto, progressoDoProjeto } from 'src/utils/gestaoProjetos';

const COR_PRAZO = {
  default: 'text.secondary',
  warning: 'warning.main',
  error: 'error.main',
} as const;

interface Props {
  projeto: GestaoProjeto;
  acoes: Acao[];
  aoAbrir: () => void;
  /** Celular: só nome, progresso, coordenador (avatar) e prazo. */
  compacto?: boolean;
}

/**
 * Cartão do quadro da Gestão de Projetos: processo (discreto) acima do nome;
 * progresso das etapas; rodapé com coordenador e prazo.
 */
const CartaoGestaoProjeto = ({ projeto: p, acoes, aoAbrir, compacto = false }: Props) => {
  const progresso = progressoDoProjeto(p);
  const prazo = prazoDoProjeto(p.dataFim);
  const [coordenador, ...outros] = p.coordenadores;

  return (
    <BlankCard>
      <Box p={compacto ? 1.25 : 2} pb={compacto ? 1 : 1.5}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box flexGrow={1} minWidth={0} onClick={aoAbrir} sx={{ cursor: 'pointer' }}>
            {compacto ? null : (
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                color="text.secondary"
                mb={0.5}
              >
                <IconFileText size={14} />
                <Typography variant="caption" fontWeight={500} noWrap>
                  {p.processo ? `Processo ${p.processo}` : 'Sem processo'}
                </Typography>
              </Stack>
            )}
            <Typography
              variant={compacto ? 'subtitle2' : 'h6'}
              fontWeight={600}
              lineHeight={1.3}
              sx={{ overflowWrap: 'anywhere' }}
            >
              {p.nome}
            </Typography>
          </Box>
          <Box mt={-0.5} mr={-1}>
            <MenuAcoes rotulo={`Ações de ${p.nome}`} acoes={acoes} />
          </Box>
        </Stack>

        <Box mt={compacto ? 1 : 1.5} onClick={aoAbrir} sx={{ cursor: 'pointer' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LinearProgress
              variant="determinate"
              value={progresso}
              color={progresso === 100 ? 'success' : 'primary'}
              sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
              aria-label={`Progresso: ${progresso}%`}
            />
            <Typography variant="subtitle2" fontWeight={700} minWidth={36} textAlign="right">
              {progresso}%
            </Typography>
          </Stack>
          <Typography variant="caption" color="textSecondary" display={compacto ? 'none' : 'block'}>
            {p.etapasTotal
              ? `${p.etapasConcluidas} de ${p.etapasTotal} etapa${p.etapasTotal === 1 ? '' : 's'} concluída${p.etapasConcluidas === 1 ? '' : 's'}`
              : 'Sem etapas'}
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        px={compacto ? 1.25 : 2}
        py={compacto ? 0.75 : 1.25}
      >
        <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
          {coordenador ? (
            <>
              <Tooltip title={p.coordenadores.map((c) => c.nomeCompleto).join(', ')}>
                <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: 'primary.main' }}>
                  {iniciais(coordenador.nomeCompleto)}
                </Avatar>
              </Tooltip>
              <Typography variant="body2" noWrap display={compacto ? 'none' : 'block'}>
                {coordenador.nomeCompleto}
                {outros.length ? ` +${outros.length}` : ''}
              </Typography>
            </>
          ) : (
            <Typography variant={compacto ? 'caption' : 'body2'} color="textSecondary" noWrap>
              Sem coordenador
            </Typography>
          )}
        </Stack>
        <Tooltip title={p.dataFim ? `Término: ${formatarData(p.dataFim)}` : ''}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            flexShrink={0}
            sx={{ color: COR_PRAZO[prazo.cor] }}
          >
            <IconCalendarEvent size={14} />
            <Typography variant="caption" fontWeight={600} color="inherit">
              {prazo.texto}
            </Typography>
          </Stack>
        </Tooltip>
      </Stack>
    </BlankCard>
  );
};

export default CartaoGestaoProjeto;
