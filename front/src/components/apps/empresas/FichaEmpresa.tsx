import { ReactNode, useEffect, useState } from 'react';
import { Link as LinkRouter } from 'react-router-dom';
import { Box, Button, Chip, Grid, IconButton, Link, List, ListItem, ListItemText, Stack, Tab, Tabs, Typography } from '@mui/material';
import { IconArrowLeft, IconEdit, IconTrash, IconX } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import HistoricoDoRegistro from 'src/components/compartilhados/HistoricoDoRegistro';
import { servicoEmpresas } from 'src/servicos/empresas';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { Empresa } from 'src/types/empresas';
import { GestaoProjeto, ROTULO_STATUS_GESTAO_PROJETO } from 'src/types/gestaoProjetos';
import { mensagemDeErro } from 'src/utils/erroApi';

type Aba = 'dados' | 'projetos' | 'historico';

const Fato = ({ rotulo, largo, children }: { rotulo: string; largo?: boolean; children: ReactNode }) => (
  <Grid item xs={12} sm={largo ? 12 : 6}>
    <Typography variant="caption" color="textSecondary" display="block">
      {rotulo}
    </Typography>
    <Box sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{children || '—'}</Box>
  </Grid>
);

interface Props {
  empresa: Empresa;
  podeAlterar: boolean;
  /** Aba "Projetos" só para quem vê a Gestão de Projetos. */
  verProjetos: boolean;
  aoEditar: () => void;
  aoExcluir: () => void;
  aoFechar: () => void;
}

const mesmoNome = (a: string | null, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Ficha do contratante ao lado da lista (no celular ocupa a tela): Dados, Projetos e Histórico. */
const FichaEmpresa = ({ empresa: e, podeAlterar, verProjetos, aoEditar, aoExcluir, aoFechar }: Props) => {
  const [aba, setAba] = useState<Aba>('dados');
  const [projetos, setProjetos] = useState<GestaoProjeto[] | null>(null);
  const [erroProjetos, setErroProjetos] = useState<string | null>(null);

  useEffect(() => {
    setAba('dados');
    setProjetos(null);
    setErroProjetos(null);
  }, [e.id]);

  // Projetos da Gestão de Projetos (ativos e arquivados) que têm este contratante.
  useEffect(() => {
    if (!verProjetos || aba !== 'projetos' || projetos) return undefined;
    let ativo = true;
    Promise.all([servicoGestaoProjetos.listar(), servicoGestaoProjetos.listarArquivados()])
      .then(([ativos, arquivados]) => {
        if (ativo) setProjetos([...ativos, ...arquivados].filter((p) => mesmoNome(p.contratante, e.razaoSocial)));
      })
      .catch((x) => ativo && setErroProjetos(mensagemDeErro(x)));
    return () => {
      ativo = false;
    };
  }, [aba, verProjetos, projetos, e.razaoSocial]);

  const subtitulo = [e.cnpj ? `CNPJ ${e.cnpj}` : 'CNPJ não informado', e.nomeFantasia, [e.municipio, e.uf].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(' · ');

  return (
    <BlankCard>
      <Box p={{ xs: 2, md: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Button color="inherit" size="small" startIcon={<IconArrowLeft size={16} />} onClick={aoFechar} sx={{ display: { md: 'none' } }}>
            Contratantes
          </Button>
          <IconButton size="small" aria-label="Fechar ficha" onClick={aoFechar} sx={{ ml: 'auto' }}>
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>
          {e.razaoSocial}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {subtitulo}
        </Typography>

        {podeAlterar ? (
          <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<IconEdit size={16} />} onClick={aoEditar}>
              Editar dados
            </Button>
            <Button size="small" color="error" startIcon={<IconTrash size={16} />} onClick={aoExcluir}>
              Excluir
            </Button>
          </Stack>
        ) : null}

        <Tabs value={aba} onChange={(_, v) => setAba(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="dados" label="Dados" />
          {verProjetos ? <Tab value="projetos" label={`Projetos${projetos ? ` (${projetos.length})` : ''}`} /> : null}
          <Tab value="historico" label="Histórico" />
        </Tabs>

        {aba === 'dados' ? (
          <Grid container spacing={2} mt={0.5}>
            <Fato rotulo="Razão social">{e.razaoSocial}</Fato>
            <Fato rotulo="Nome fantasia">{e.nomeFantasia}</Fato>
            <Fato rotulo="CNPJ">{e.cnpj}</Fato>
            <Fato rotulo="Telefone / contato">{e.telefone}</Fato>
            <Fato rotulo="E-mail">{e.email}</Fato>
            <Fato rotulo="Município / UF">{[e.municipio, e.uf].filter(Boolean).join(' / ')}</Fato>
            <Fato rotulo="Endereço" largo>
              {e.endereco}
            </Fato>
            <Fato rotulo="Representante">{e.representante}</Fato>
          </Grid>
        ) : null}

        {aba === 'projetos' ? (
          <Box mt={2}>
            {erroProjetos ? <Typography color="error">{erroProjetos}</Typography> : null}
            {!projetos && !erroProjetos ? <Typography color="textSecondary">Carregando…</Typography> : null}
            {projetos && !projetos.length ? (
              <Typography variant="body2" color="textSecondary">
                Nenhum projeto com este contratante. Ele é escolhido no cadastro do projeto, na Gestão de Projetos.
              </Typography>
            ) : null}
            {projetos?.length ? (
              <List dense disablePadding>
                {projetos.map((p) => (
                  <ListItem
                    key={p.id}
                    disableGutters
                    secondaryAction={<Chip size="small" label={p.arquivadoEm ? 'Arquivado' : ROTULO_STATUS_GESTAO_PROJETO[p.status]} />}
                  >
                    <ListItemText
                      sx={{ pr: 12 }}
                      primary={
                        <Link component={LinkRouter} to={`/gestao-projetos?projeto=${p.id}`} underline="hover">
                          {p.nome}
                        </Link>
                      }
                      secondary={p.processo ? `Processo ${p.processo}` : undefined}
                    />
                  </ListItem>
                ))}
              </List>
            ) : null}
          </Box>
        ) : null}

        {aba === 'historico' ? <HistoricoDoRegistro carregar={() => servicoEmpresas.historico(e.id)} versao={e.atualizadoEm} /> : null}
      </Box>
    </BlankCard>
  );
};

export default FichaEmpresa;
