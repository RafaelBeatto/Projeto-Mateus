import { PointerEvent as EventoPonteiro, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { alpha, Box, Button, ButtonBase, IconButton, Stack, Typography, useTheme } from '@mui/material';
import {
  IconBriefcase,
  IconChevronDown,
  IconChevronRight,
  IconCircle,
  IconCircleCheck,
  IconFocusCentered,
  IconMaximize,
  IconMinimize,
  IconMinus,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import type { Etapa, StatusEtapa } from 'src/types/gestaoProjetos';
import { ROTULO_STATUS_ETAPA } from 'src/types/gestaoProjetos';
import { filhasDasEtapas } from 'src/utils/gestaoProjetos';

const RAIZ = 'raiz';
const chave = (id: number) => `e${id}`;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2;
/** Distância horizontal entre um nível e o próximo, além da largura do nó. */
const ESPACO_X = 110;
const ESPACO_Y = 28;
const ALTURA_PADRAO = 110;
/** Arrastar menos que isso é clique. */
const LIMIAR_ARRASTO = 4;

const COR_STATUS: Record<StatusEtapa, 'grey' | 'warning' | 'primary' | 'success'> = {
  EM_ESPERA: 'grey',
  EM_PAUSA: 'warning',
  EM_ANDAMENTO: 'primary',
  CONCLUIDO: 'success',
};
const STATUS: StatusEtapa[] = ['EM_ESPERA', 'EM_PAUSA', 'EM_ANDAMENTO', 'CONCLUIDO'];

interface Ponto {
  x: number;
  y: number;
}

/** Posições arrastadas e ramificações abertas, lembradas neste navegador por projeto. */
interface Preferencias {
  posicoes: Record<string, Ponto>;
  abertas: number[];
}

const chavePreferencias = (projetoId: number) => `gestaoProjetos.mapa.${projetoId}`;

function lerPreferencias(projetoId: number): Preferencias {
  try {
    const texto = localStorage.getItem(chavePreferencias(projetoId));
    if (texto) return { posicoes: {}, abertas: [], ...(JSON.parse(texto) as Partial<Preferencias>) };
  } catch {
    // Sem armazenamento: começa do padrão.
  }
  return { posicoes: {}, abertas: [] };
}

function gravarPreferencias(projetoId: number, p: Preferencias) {
  try {
    localStorage.setItem(chavePreferencias(projetoId), JSON.stringify(p));
  } catch {
    // Sem armazenamento (ex.: janela anônima): vale só até sair da tela.
  }
}

interface Props {
  projetoId: number;
  nomeProjeto: string;
  etapas: Etapa[];
  /** Ids das que passam pelos filtros; as outras ficam apagadas. null = sem filtro. */
  destacadas: Set<number> | null;
  compacto?: boolean;
  /** Clicar no título abre a etapa (é lá que se edita). */
  aoAbrir: (e: Etapa) => void;
}

/**
 * Mapa das ramificações, só para visualizar: o projeto à esquerda e cada etapa saindo de onde foi
 * criada (o "Sai de" da etapa). Arrastar o fundo move o mapa; arrastar o topo de um nó muda a posição
 * dele (lembrada neste navegador). Ctrl + roda do mouse ou os botões dão zoom; "Resetar" volta ao
 * arranjo automático; "Tela cheia" ocupa a tela toda.
 */
const MapaRamificacoes = ({ projetoId, nomeProjeto, etapas, destacadas, compacto = false, aoAbrir }: Props) => {
  const tema = useTheme();
  const largura = compacto ? 190 : 220;
  const filhas = useMemo(() => filhasDasEtapas(etapas), [etapas]);
  const porChave = useMemo(() => new Map(etapas.map((e) => [chave(e.id), e])), [etapas]);

  const [preferencias, setPreferencias] = useState<Preferencias>(() => lerPreferencias(projetoId));
  // Ao soltar um nó arrastado, grava a posição final (o estado pode não ter sido renderizado ainda).
  const preferenciasAtuais = useRef(preferencias);
  preferenciasAtuais.current = preferencias;
  const atualizarPreferencias = useCallback(
    (mudar: (p: Preferencias) => Preferencias) =>
      setPreferencias((atual) => {
        const nova = mudar(atual);
        gravarPreferencias(projetoId, nova);
        return nova;
      }),
    [projetoId],
  );
  const abertas = useMemo(() => new Set(preferencias.abertas), [preferencias.abertas]);
  const alternarAberta = (id: number) =>
    atualizarPreferencias((p) => ({
      ...p,
      abertas: abertas.has(id) ? p.abertas.filter((x) => x !== id) : [...p.abertas, id],
    }));

  // Altura real de cada nó (muda ao abrir a lista de tarefas).
  const nos = useRef(new Map<string, HTMLElement>());
  const [alturas, setAlturas] = useState<Map<string, number>>(new Map());
  const medir = useCallback(() => {
    const novas = new Map<string, number>();
    nos.current.forEach((el, k) => novas.set(k, el.offsetHeight));
    setAlturas((antigas) =>
      antigas.size === novas.size && [...novas].every(([k, v]) => antigas.get(k) === v) ? antigas : novas,
    );
  }, []);
  useLayoutEffect(() => {
    medir();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observador = new ResizeObserver(medir);
    nos.current.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [medir, etapas, abertas]);
  const alturaDe = useCallback((k: string) => alturas.get(k) ?? ALTURA_PADRAO, [alturas]);

  /** Arranjo automático: cada nível numa coluna; o pai fica no meio das suas ramificações. */
  const automaticas = useMemo(() => {
    const posicoes = new Map<string, Ponto>();
    let proximoY = 0;
    const colocar = (k: string, nivel: number, lista: Etapa[]): number => {
      const altura = alturaDe(k);
      const x = nivel * (largura + ESPACO_X);
      if (!lista.length) {
        const y = proximoY;
        proximoY += altura + ESPACO_Y;
        posicoes.set(k, { x, y });
        return y + altura / 2;
      }
      const centros = lista.map((f) => colocar(chave(f.id), nivel + 1, filhas.get(f.id) ?? []));
      const meio = (centros[0] + centros[centros.length - 1]) / 2;
      const y = meio - altura / 2;
      posicoes.set(k, { x, y });
      proximoY = Math.max(proximoY, y + altura + ESPACO_Y);
      return meio;
    };
    colocar(RAIZ, 0, filhas.get(null) ?? []);
    return posicoes;
  }, [filhas, alturaDe, largura]);

  const posicaoDe = useCallback(
    (k: string): Ponto => preferencias.posicoes[k] ?? automaticas.get(k) ?? { x: 0, y: 0 },
    [preferencias.posicoes, automaticas],
  );

  const ligacoes = useMemo(
    () =>
      etapas.map((e) => {
        const pai = e.etapaPaiId != null && porChave.has(chave(e.etapaPaiId)) ? chave(e.etapaPaiId) : RAIZ;
        const a = posicaoDe(pai);
        const b = posicaoDe(chave(e.id));
        const x1 = a.x + largura;
        const y1 = a.y + alturaDe(pai) / 2;
        const x2 = b.x;
        const y2 = b.y + alturaDe(chave(e.id)) / 2;
        const curva = Math.max(30, Math.abs(x2 - x1) / 2);
        return {
          id: e.id,
          caminho: `M ${x1} ${y1} C ${x1 + curva} ${y1}, ${x2 - curva} ${y2}, ${x2} ${y2}`,
          apagada: destacadas != null && !destacadas.has(e.id),
        };
      }),
    [etapas, porChave, posicaoDe, alturaDe, largura, destacadas],
  );

  // ---------- zoom e deslocamento ----------
  const tela = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState({ zoom: 1, x: 40, y: 40 });

  const centralizar = useCallback(() => {
    const caixa = tela.current;
    if (!caixa) return;
    const chaves = [RAIZ, ...etapas.map((e) => chave(e.id))];
    const pontos = chaves.map((k) => ({ ...posicaoDe(k), h: alturaDe(k) }));
    const minX = Math.min(...pontos.map((p) => p.x));
    const minY = Math.min(...pontos.map((p) => p.y));
    const maxX = Math.max(...pontos.map((p) => p.x + largura));
    const maxY = Math.max(...pontos.map((p) => p.y + p.h));
    const margem = 40;
    const zoom = Math.min(
      1,
      Math.max(ZOOM_MIN, Math.min((caixa.clientWidth - margem * 2) / (maxX - minX), (caixa.clientHeight - margem * 2) / (maxY - minY))),
    );
    setVista({
      zoom,
      x: (caixa.clientWidth - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: (caixa.clientHeight - (maxY - minY) * zoom) / 2 - minY * zoom,
    });
  }, [etapas, posicaoDe, alturaDe, largura]);

  // Abre centralizado (depois da primeira medida dos nós).
  const centralizado = useRef(false);
  useEffect(() => {
    if (centralizado.current || !alturas.size) return;
    centralizado.current = true;
    centralizar();
  }, [alturas, centralizar]);

  /** Zoom mantendo parado o ponto (px, py) da tela. */
  const aplicarZoom = useCallback((fator: number, px?: number, py?: number) => {
    const caixa = tela.current;
    setVista((v) => {
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * fator));
      const cx = px ?? (caixa?.clientWidth ?? 0) / 2;
      const cy = py ?? (caixa?.clientHeight ?? 0) / 2;
      return { zoom, x: cx - ((cx - v.x) * zoom) / v.zoom, y: cy - ((cy - v.y) * zoom) / v.zoom };
    });
  }, []);

  // Ctrl/⌘ + roda = zoom (a roda sozinha continua rolando a página).
  useEffect(() => {
    const caixa = tela.current;
    if (!caixa) return undefined;
    const aoRolar = (ev: WheelEvent) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      const r = caixa.getBoundingClientRect();
      aplicarZoom(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top);
    };
    caixa.addEventListener('wheel', aoRolar, { passive: false });
    return () => caixa.removeEventListener('wheel', aoRolar);
  }, [aplicarZoom]);

  const resetar = () => {
    atualizarPreferencias((p) => ({ ...p, posicoes: {} }));
    centralizado.current = false;
    setAlturas((a) => new Map(a));
  };

  // ---------- arrastar: o fundo move o mapa; o topo do nó move o nó ----------
  const arrasto = useRef<{ tipo: 'fundo' | 'no'; k?: string; inicio: Ponto; origem: Ponto; moveu: boolean } | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);

  const iniciarFundo = (ev: EventoPonteiro<HTMLDivElement>) => {
    if (ev.button !== 0 || ev.target !== ev.currentTarget) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    arrasto.current = { tipo: 'fundo', inicio: { x: ev.clientX, y: ev.clientY }, origem: { x: vista.x, y: vista.y }, moveu: false };
  };

  const iniciarNo = (k: string) => (ev: EventoPonteiro<HTMLElement>) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    arrasto.current = { tipo: 'no', k, inicio: { x: ev.clientX, y: ev.clientY }, origem: posicaoDe(k), moveu: false };
  };

  const mover = (ev: EventoPonteiro<HTMLElement>) => {
    const a = arrasto.current;
    if (!a) return;
    const dx = ev.clientX - a.inicio.x;
    const dy = ev.clientY - a.inicio.y;
    if (!a.moveu && Math.hypot(dx, dy) < LIMIAR_ARRASTO) return;
    a.moveu = true;
    if (a.tipo === 'fundo') {
      setVista((v) => ({ ...v, x: a.origem.x + dx, y: a.origem.y + dy }));
    } else {
      setArrastando(a.k!);
      const novo = { x: a.origem.x + dx / vista.zoom, y: a.origem.y + dy / vista.zoom };
      setPreferencias((p) => ({ ...p, posicoes: { ...p.posicoes, [a.k!]: novo } }));
    }
  };

  /** Devolve true se foi um arrasto (aí o clique não vale). */
  const soltar = () => {
    const a = arrasto.current;
    arrasto.current = null;
    setArrastando(null);
    if (a?.tipo === 'no' && a.moveu) gravarPreferencias(projetoId, preferenciasAtuais.current);
    return !!a?.moveu;
  };

  // ---------- nós ----------
  const totalTarefas = etapas.reduce((s, e) => s + e.tarefas.length, 0);

  const registrarNo = (k: string) => (el: HTMLElement | null) => {
    if (el) nos.current.set(k, el);
    else nos.current.delete(k);
  };

  const cartao = (k: string, conteudo: ReactNode, raiz = false, apagado = false) => {
    const p = posicaoDe(k);
    return (
      <Box
        key={k}
        ref={registrarNo(k)}
        position="absolute"
        left={p.x}
        top={p.y}
        width={largura}
        sx={{
          bgcolor: raiz ? alpha(tema.palette.primary.main, 0.12) : 'background.paper',
          border: 1,
          borderColor: raiz ? 'primary.main' : 'divider',
          borderRadius: 1.5,
          boxShadow: arrastando === k ? 8 : 2,
          opacity: apagado ? 0.35 : 1,
          transition: arrastando === k ? 'none' : 'opacity .15s, box-shadow .15s',
          zIndex: arrastando === k ? 2 : 1,
          pointerEvents: 'auto',
        }}
      >
        {conteudo}
      </Box>
    );
  };

  /** Topo do nó: é por ele que se arrasta; clicar no título abre. */
  const topo = (k: string, icone: ReactNode, titulo: string, aoClicar: () => void) => (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      px={1.25}
      pt={1}
      title={titulo}
      onPointerDown={iniciarNo(k)}
      onPointerUp={() => {
        if (!soltar()) aoClicar();
      }}
      sx={{ cursor: arrastando === k ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
    >
      {icone}
      <Typography variant="subtitle2" fontWeight={700} noWrap flexGrow={1} minWidth={0}>
        {titulo}
      </Typography>
    </Stack>
  );

  const noRaiz = cartao(
    RAIZ,
    <>
      {topo(RAIZ, <IconBriefcase size={16} />, nomeProjeto, () => undefined)}
      <Typography variant="caption" color="textSecondary" display="block" px={1.25} pt={0.5} pb={1.25}>
        {totalTarefas} {totalTarefas === 1 ? 'tarefa' : 'tarefas'} · {etapas.length}{' '}
        {etapas.length === 1 ? 'ramificação' : 'ramificações'}
      </Typography>
    </>,
    true,
  );

  const corDoStatus = (s: StatusEtapa) => {
    const cor = COR_STATUS[s];
    return cor === 'grey' ? tema.palette.grey[500] : tema.palette[cor].main;
  };

  const losango = (s: StatusEtapa) => (
    <Box
      component="span"
      title={ROTULO_STATUS_ETAPA[s]}
      sx={{ display: 'inline-block', width: 9, height: 9, flexShrink: 0, transform: 'rotate(45deg)', bgcolor: corDoStatus(s), borderRadius: 0.25 }}
    />
  );

  const noEtapa = (e: Etapa) => {
    const k = chave(e.id);
    const feitas = e.tarefas.filter((t) => t.feita).length;
    const aberta = abertas.has(e.id) && e.tarefas.length > 0;
    return cartao(
      k,
      <>
        {topo(k, losango(e.status), e.titulo, () => aoAbrir(e))}
        <ButtonBase
          disabled={!e.tarefas.length}
          onClick={() => alternarAberta(e.id)}
          aria-expanded={aberta}
          aria-label={aberta ? 'Esconder tarefas' : 'Mostrar tarefas'}
          sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%', px: 1.25, pt: 0.5, pb: aberta ? 0 : 1.25, textAlign: 'left' }}
        >
          <Box flexGrow={1}>
            <Typography variant="caption" color="textSecondary" display="block" lineHeight={1.5}>
              {e.tarefas.length} {e.tarefas.length === 1 ? 'tarefa' : 'tarefas'}
            </Typography>
            <Typography variant="caption" color={feitas && feitas === e.tarefas.length ? 'success.main' : 'textSecondary'} display="block" lineHeight={1.5}>
              {feitas} {feitas === 1 ? 'concluída' : 'concluídas'}
            </Typography>
          </Box>
          {e.tarefas.length ? (
            <Box color="text.secondary" mt={0.25}>
              {aberta ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            </Box>
          ) : null}
        </ButtonBase>
        {aberta ? (
          <Box component="ul" mt={0.75} mb={0} pt={0.5} pb={0.75} pl={0} borderTop={1} borderColor="divider" sx={{ listStyle: 'none' }}>
            {e.tarefas.map((t) => (
              <Stack key={t.id} component="li" direction="row" spacing={0.75} px={1.25} py={0.5} alignItems="flex-start">
                <Box color={t.feita ? 'success.main' : 'text.secondary'} display="flex" flexShrink={0} aria-label={t.feita ? 'Concluída' : 'Pendente'}>
                  {t.feita ? <IconCircleCheck size={15} /> : <IconCircle size={15} />}
                </Box>
                <Typography
                  variant="caption"
                  color={t.feita ? 'textSecondary' : 'textPrimary'}
                  sx={{ textDecoration: t.feita ? 'line-through' : undefined, overflowWrap: 'anywhere' }}
                >
                  {t.texto}
                </Typography>
              </Stack>
            ))}
          </Box>
        ) : null}
      </>,
      false,
      destacadas != null && !destacadas.has(e.id),
    );
  };

  // ---------- tela cheia (Fullscreen do navegador; sem ele, ocupa a janela) ----------
  const area = useRef<HTMLDivElement>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const nativa = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  useEffect(() => {
    if (!nativa) return undefined;
    const aoMudar = () => setTelaCheia(document.fullscreenElement === area.current);
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, [nativa]);

  useEffect(() => {
    if (nativa || !telaCheia) return undefined;
    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setTelaCheia(false);
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [nativa, telaCheia]);

  // O tamanho do quadro mudou: centraliza de novo.
  const primeiraVez = useRef(true);
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return undefined;
    }
    const quadro = requestAnimationFrame(centralizar);
    return () => cancelAnimationFrame(quadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telaCheia]);

  const alternarTelaCheia = () => {
    if (!nativa) {
      setTelaCheia((v) => !v);
      return;
    }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else area.current?.requestFullscreen().catch(() => setTelaCheia(true));
  };

  const estiloBotao = { border: 1, borderColor: 'divider', borderRadius: 1 };

  return (
    <Box
      ref={area}
      sx={
        telaCheia
          ? {
              position: nativa ? 'static' : 'fixed',
              inset: 0,
              zIndex: tema.zIndex.modal,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              p: 2,
              bgcolor: 'background.default',
            }
          : undefined
      }
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap minWidth={0}>
          {telaCheia ? (
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {nomeProjeto}
            </Typography>
          ) : null}
          {compacto
            ? null
            : STATUS.map((s) => (
                <Stack key={s} direction="row" spacing={0.75} alignItems="center">
                  {losango(s)}
                  <Typography variant="caption" color="textSecondary">
                    {ROTULO_STATUS_ETAPA[s]}
                  </Typography>
                </Stack>
              ))}
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconButton size="small" aria-label="Diminuir zoom" onClick={() => aplicarZoom(1 / 1.2)} sx={estiloBotao}>
            <IconMinus size={16} />
          </IconButton>
          <Typography variant="body2" minWidth={44} textAlign="center" aria-live="polite">
            {Math.round(vista.zoom * 100)}%
          </Typography>
          <IconButton size="small" aria-label="Aumentar zoom" onClick={() => aplicarZoom(1.2)} sx={estiloBotao}>
            <IconPlus size={16} />
          </IconButton>
          <Button size="small" variant="outlined" color="inherit" startIcon={<IconFocusCentered size={16} />} onClick={centralizar} aria-label="Centralizar">
            {compacto ? null : 'Centralizar'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<IconRefresh size={16} />}
            onClick={resetar}
            title="Volta as posições ao arranjo automático"
            aria-label="Resetar"
          >
            {compacto ? null : 'Resetar'}
          </Button>
          <Button
            size="small"
            variant={telaCheia ? 'contained' : 'outlined'}
            color={telaCheia ? 'primary' : 'inherit'}
            startIcon={telaCheia ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
            onClick={alternarTelaCheia}
            aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {compacto ? null : telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
          </Button>
        </Stack>
      </Stack>
      <Box
        ref={tela}
        role="application"
        aria-label="Mapa das ramificações do projeto"
        onPointerDown={iniciarFundo}
        onPointerMove={mover}
        onPointerUp={soltar}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          ...(telaCheia ? { flexGrow: 1, minHeight: 0 } : { height: compacto ? 460 : 620 }),
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: tema.palette.mode === 'dark' ? alpha(tema.palette.common.black, 0.25) : tema.palette.grey[100],
          backgroundImage: `radial-gradient(${alpha(tema.palette.text.secondary, 0.25)} 1px, transparent 1px)`,
          backgroundSize: `${18 * vista.zoom}px ${18 * vista.zoom}px`,
          backgroundPosition: `${vista.x}px ${vista.y}px`,
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
          touchAction: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
        >
          <svg
            aria-hidden
            width={1}
            height={1}
            style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            {ligacoes.map((l) => (
              <path
                key={l.id}
                d={l.caminho}
                fill="none"
                stroke={alpha(tema.palette.text.secondary, 0.6)}
                strokeWidth={1.5 / Math.max(vista.zoom, 0.6)}
                opacity={l.apagada ? 0.3 : 1}
              />
            ))}
          </svg>
          {noRaiz}
          {etapas.map(noEtapa)}
        </Box>
      </Box>
    </Box>
  );
};

export default MapaRamificacoes;
