import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Grid, LinearProgress, MenuItem, Stack, TextField, Theme, Typography, useMediaQuery } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import FichaEmpresa from 'src/components/apps/empresas/FichaEmpresa';
import FormularioEmpresa from 'src/components/apps/empresas/FormularioEmpresa';
import LinhaEmpresa from 'src/components/apps/empresas/LinhaEmpresa';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { BotaoFiltros, PainelFiltros } from 'src/components/compartilhados/Filtros';
import { useConsulta } from 'src/hooks/useConsulta';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoEmpresas } from 'src/servicos/empresas';
import type { Empresa } from 'src/types/empresas';
import { mensagemDeErro } from 'src/utils/erroApi';
import { normalizar } from 'src/utils/formatacao';
import { useSelector } from 'src/store/Store';

const soDigitos = (v: string | null) => (v ?? '').replace(/\D/g, '');
const cidadeDe = (e: Empresa) => [e.municipio, e.uf].filter(Boolean).join('/');

/** Busca por nome, nome fantasia, cidade, UF, representante, e-mail; números acham CNPJ e telefone com ou sem pontuação. */
function combina(e: Empresa, busca: string) {
  const q = normalizar(busca);
  if (!q) return true;
  const texto = normalizar([e.razaoSocial, e.nomeFantasia, e.cnpj, e.municipio, e.uf, e.representante, e.email, e.telefone].join(' '));
  if (texto.includes(q)) return true;
  const digitos = soDigitos(busca);
  return digitos.length >= 3 && (soDigitos(e.cnpj).includes(digitos) || soDigitos(e.telefone).includes(digitos));
}

const FILTRO_VAZIO = { busca: '', cidade: '' };

/** Contratantes: cadastro único por unidade (a cidade de cada um vai para os projetos). */
const Empresas = () => {
  const { podeAlterar, tem } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.EMPRESA_ESCREVER);
  const celular = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const unidadeVisualizadaId = useSelector((s) => s.autenticacao.unidadeVisualizadaId);

  const { dados: empresas, carregando, erro, definirDados } = useConsulta(servicoEmpresas.listar);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // A busca fica sempre à vista; o painel guarda a cidade.
  const temFiltro = !!(filtro.cidade || filtro.busca.trim());
  const [formulario, setFormulario] = useState<{ aberto: boolean; empresa: Empresa | null }>({ aberto: false, empresa: null });

  useEffect(() => setSelecionadaId(null), [unidadeVisualizadaId]);

  // Vindo de um projeto: /empresas?empresa=ID abre a ficha.
  const [parametros, setParametros] = useSearchParams();
  const empresaPedida = Number(parametros.get('empresa')) || null;
  useEffect(() => {
    if (!empresaPedida) return;
    setSelecionadaId(empresaPedida);
    setParametros({}, { replace: true });
  }, [empresaPedida, setParametros]);

  const todas = useMemo(() => [...(empresas ?? [])].sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR')), [empresas]);
  const selecionada = todas.find((e) => e.id === selecionadaId) ?? null;
  const filtradas = useMemo(
    () => todas.filter((e) => combina(e, filtro.busca) && (!filtro.cidade || cidadeDe(e) === filtro.cidade)),
    [todas, filtro],
  );
  const cidades = useMemo(
    () => [...new Set(todas.map(cidadeDe).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [todas],
  );

  const substituir = (e: Empresa) => definirDados((lista) => [...(lista ?? []).filter((x) => x.id !== e.id), e]);

  const excluir = async (e: Empresa) => {
    if (!(await confirmar(`Excluir o contratante "${e.razaoSocial}"?`, { rotuloConfirmar: 'Excluir', perigo: true }))) return;
    try {
      await servicoEmpresas.excluir(e.id);
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== e.id));
      setSelecionadaId(null);
      notificar('Contratante excluído.');
    } catch (err) {
      notificar(mensagemDeErro(err), 'error');
    }
  };

  const novo = () => setFormulario({ aberto: true, empresa: null });

  const lista = (
    <>
      <Stack direction="row" spacing={1.5} mb={2} alignItems="center">
        {cidades.length > 1 ? (
          <BotaoFiltros
            aberto={filtrosAbertos}
            ativo={!!filtro.cidade}
            aoAlternar={() => setFiltrosAbertos((v) => !v)}
            rotulo="Filtros dos contratantes"
          />
        ) : null}
        <TextField
          type="search"
          size="small"
          placeholder="Buscar por nome, CNPJ, cidade, telefone…"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          inputProps={{ 'aria-label': 'Buscar contratante' }}
          sx={{ flexGrow: 1, minWidth: 0 }}
        />
        {alterar ? (
          <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={novo} sx={{ flexShrink: 0 }} aria-label="Novo contratante">
            {celular ? 'Novo' : 'Novo contratante'}
          </Button>
        ) : null}
      </Stack>
      <PainelFiltros aberto={filtrosAbertos && cidades.length > 1}>
        <TextField
          select
          size="small"
          value={filtro.cidade}
          onChange={(e) => setFiltro({ ...filtro, cidade: e.target.value })}
          sx={{ minWidth: 240 }}
          SelectProps={{ displayEmpty: true }}
          inputProps={{ 'aria-label': 'Cidade' }}
        >
          <MenuItem value="">Todas as cidades</MenuItem>
          {cidades.map((c) => (
            <MenuItem key={c} value={c}>
              {c} ({todas.filter((e) => cidadeDe(e) === c).length})
            </MenuItem>
          ))}
        </TextField>
      </PainelFiltros>
      {temFiltro && todas.length ? (
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <Typography variant="body2" color="textSecondary">
            {filtradas.length} de {todas.length} contratantes
          </Typography>
          <Button size="small" variant="text" onClick={() => setFiltro(FILTRO_VAZIO)}>
            Limpar filtros
          </Button>
        </Stack>
      ) : null}
      {carregando && !empresas ? <LinearProgress /> : null}
      {erro ? <Alert severity="error">{erro}</Alert> : null}
      {empresas && !todas.length ? (
        <Box textAlign="center" py={6}>
          <Typography variant="h6">Nenhum contratante cadastrado</Typography>
          <Typography color="textSecondary">
            Cadastre aqui os contratantes uma vez só: depois é só escolhê-los nos projetos.
          </Typography>
        </Box>
      ) : null}
      {todas.length > 0 && !filtradas.length ? <Typography color="textSecondary">Nenhum contratante com esses filtros.</Typography> : null}
      {filtradas.map((e) => (
        <LinhaEmpresa key={e.id} empresa={e} selecionada={e.id === selecionadaId} aoAbrir={() => setSelecionadaId((atual) => (atual === e.id && !celular ? null : e.id))} />
      ))}
    </>
  );

  const detalhe = selecionada ? (
    <FichaEmpresa
      empresa={selecionada}
      podeAlterar={alterar}
      verProjetos={tem(PERMISSOES.GESTAO_PROJETO_LER)}
      aoEditar={() => setFormulario({ aberto: true, empresa: selecionada })}
      aoExcluir={() => excluir(selecionada)}
      aoFechar={() => setSelecionadaId(null)}
    />
  ) : null;

  return (
    <Pagina>
      {celular && detalhe ? (
        detalhe
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={detalhe ? 6 : 12} lg={detalhe ? 7 : 12}>
            {lista}
          </Grid>
          {detalhe ? (
            <Grid item xs={12} md={6} lg={5}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 90 } }}>{detalhe}</Box>
            </Grid>
          ) : null}
        </Grid>
      )}

      <FormularioEmpresa
        aberto={formulario.aberto}
        empresa={formulario.empresa}
        aoFechar={() => setFormulario({ aberto: false, empresa: null })}
        aoSalvar={({ empresa, jaExistia }) => {
          substituir(empresa);
          setSelecionadaId(empresa.id);
          if (jaExistia) notificar(`"${empresa.razaoSocial}" já está cadastrado.`, 'info');
          else notificar(formulario.empresa ? 'Contratante atualizado.' : 'Contratante cadastrado.');
        }}
      />
    </Pagina>
  );
};

export default Empresas;
