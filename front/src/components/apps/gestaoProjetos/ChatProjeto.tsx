import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  LinearProgress,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import Picker from 'emoji-picker-react';
import { IconMessages, IconMoodSmile, IconSend } from '@tabler/icons-react';
import BlankCard from 'src/components/shared/BlankCard';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { LIMITES } from 'src/constantes/limites';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import { useSelector } from 'src/store/Store';
import type { MensagemProjeto } from 'src/types/gestaoProjetos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarData, formatarHora, iniciais } from 'src/utils/formatacao';

/** De quanto em quanto tempo busca mensagens novas enquanto o chat está aberto. */
const INTERVALO_ATUALIZACAO_MS = 4000;
const POR_PAGINA = 50;

const diaDe = (iso: string) => new Date(iso).toLocaleDateString('sv-SE');

interface Props {
  projetoId: number;
}

/**
 * Chat próprio do projeto (conversa em grupo de quem vê o projeto), com o mesmo
 * desenho do chat do Painel: balões, emojis, Enter envia e Shift+Enter quebra linha.
 */
const ChatProjeto = ({ projetoId }: Props) => {
  const { notificar } = useInteracao();
  const meuId = useSelector((s) => s.autenticacao.usuario?.id);
  const [lista, setLista] = useState<MensagemProjeto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [temAnteriores, setTemAnteriores] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ancoraEmoji, setAncoraEmoji] = useState<HTMLButtonElement | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const ultimaIdRef = useRef<number | undefined>(undefined);
  const restante = LIMITES.MENSAGEM_TEXTO - texto.length;

  /** Junta mensagens sem repetir (a mesma pode chegar pelo envio e pela atualização). */
  const juntar = useCallback((novas: MensagemProjeto[]) => {
    if (!novas.length) return;
    setLista((atual) => {
      const ids = new Set((atual ?? []).map((m) => m.id));
      return [...(atual ?? []), ...novas.filter((m) => !ids.has(m.id))].sort((a, b) => a.id - b.id);
    });
  }, []);

  // Carrega as últimas ao abrir o projeto.
  useEffect(() => {
    let ativo = true;
    setLista(null);
    setErro(null);
    servicoGestaoProjetos
      .mensagens(projetoId)
      .then((m) => {
        if (!ativo) return;
        setLista(m);
        setTemAnteriores(m.length >= POR_PAGINA);
      })
      .catch((e) => ativo && setErro(mensagemDeErro(e)));
    return () => {
      ativo = false;
    };
  }, [projetoId]);

  const ultimaId = lista?.[lista.length - 1]?.id;
  useEffect(() => {
    ultimaIdRef.current = ultimaId;
  }, [ultimaId]);

  // Busca as novas de tempos em tempos (só com a aba do navegador visível).
  const carregado = lista !== null;
  useEffect(() => {
    if (!carregado) return undefined;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      servicoGestaoProjetos
        .mensagens(projetoId, { depoisDeId: ultimaIdRef.current ?? 0 })
        .then(juntar)
        .catch(() => undefined);
    }, INTERVALO_ATUALIZACAO_MS);
    return () => window.clearInterval(timer);
  }, [carregado, projetoId, juntar]);

  // Mensagem nova: rola só a caixa de mensagens até o fim.
  useEffect(() => {
    if (caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight;
  }, [ultimaId]);

  const carregarAnteriores = async () => {
    const primeira = lista?.[0];
    if (!primeira) return;
    const alturaAntes = caixa.current?.scrollHeight ?? 0;
    try {
      const anteriores = await servicoGestaoProjetos.mensagens(projetoId, {
        antesDeId: primeira.id,
      });
      setTemAnteriores(anteriores.length >= POR_PAGINA);
      setLista((atual) => [...anteriores, ...(atual ?? [])]);
      // Mantém na tela a mensagem que estava em cima.
      requestAnimationFrame(() => {
        if (caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight - alturaAntes;
      });
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setTexto('');
    setEnviando(true);
    try {
      juntar([await servicoGestaoProjetos.enviarMensagem(projetoId, conteudo)]);
    } catch (erroEnvio) {
      setTexto(conteudo);
      notificar(mensagemDeErro(erroEnvio), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const participantes = new Set((lista ?? []).map((m) => m.remetente?.id).filter(Boolean)).size;

  return (
    <BlankCard>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1.5} p={2}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
            <IconMessages size={22} />
          </Avatar>
          <Box>
            <Typography variant="h6">Chat do projeto</Typography>
            <Typography variant="caption" color="textSecondary">
              {participantes
                ? `${participantes} participante${participantes === 1 ? '' : 's'} na conversa`
                : 'Conversa da equipe deste projeto'}
            </Typography>
          </Box>
        </Stack>
        <Divider />

        {lista === null && !erro ? <LinearProgress /> : null}
        {erro ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {erro}
          </Alert>
        ) : null}

        <Box
          ref={caixa}
          sx={{
            height: { xs: 'calc(100vh - 380px)', lg: '460px' },
            minHeight: 280,
            overflowY: 'auto',
          }}
          p={{ xs: 2, md: 3 }}
        >
          {temAnteriores ? (
            <Box textAlign="center" mb={2}>
              <Button size="small" onClick={carregarAnteriores}>
                Carregar mensagens anteriores
              </Button>
            </Box>
          ) : null}

          {lista && !lista.length ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              height="100%"
              spacing={1}
              color="text.secondary"
              textAlign="center"
            >
              <IconMessages size={40} stroke={1.2} />
              <Typography variant="subtitle1" fontWeight={600}>
                Nenhuma mensagem ainda
              </Typography>
              <Typography variant="body2">
                Comece a conversa: todos que acessam este projeto veem as mensagens.
              </Typography>
            </Stack>
          ) : null}

          {(lista ?? []).map((m, indice) => {
            const minha = m.remetente?.id === meuId;
            const anterior = lista?.[indice - 1];
            const mudouDia = !anterior || diaDe(anterior.enviadaEm) !== diaDe(m.enviadaEm);
            // Mostra nome e foto só na primeira de uma sequência da mesma pessoa.
            const inicioDeSequencia = mudouDia || anterior?.remetente?.id !== m.remetente?.id;
            const nome = m.remetente?.nomeCompleto ?? 'Usuário removido';
            return (
              <Box key={m.id}>
                {mudouDia ? (
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      {formatarData(diaDe(m.enviadaEm))}
                    </Typography>
                  </Divider>
                ) : null}
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent={minha ? 'flex-end' : 'flex-start'}
                  alignItems="flex-end"
                  mt={inicioDeSequencia ? 1.5 : 0.5}
                >
                  {!minha ? (
                    <Box width={32} flexShrink={0}>
                      {inicioDeSequencia ? (
                        <Avatar
                          sx={{ width: 32, height: 32, fontSize: 12, bgcolor: 'secondary.main' }}
                        >
                          {iniciais(nome)}
                        </Avatar>
                      ) : null}
                    </Box>
                  ) : null}
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems={minha ? 'flex-end' : 'flex-start'}
                    maxWidth={{ xs: '80%', md: '520px' }}
                  >
                    {!minha && inicioDeSequencia ? (
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="textSecondary"
                        mb={0.25}
                      >
                        {nome}
                        {m.remetente?.cargoNome ? ` · ${m.remetente.cargoNome}` : ''}
                      </Typography>
                    ) : null}
                    <Box
                      sx={{
                        p: 1,
                        px: 1.5,
                        borderRadius: 2,
                        borderTopLeftRadius: !minha && inicioDeSequencia ? 4 : undefined,
                        borderTopRightRadius: minha && inicioDeSequencia ? 4 : undefined,
                        bgcolor: minha ? 'primary.main' : 'grey.100',
                        color: minha ? 'primary.contrastText' : 'text.primary',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {m.texto}
                    </Box>
                    <Typography variant="caption" color="grey.400" mt={0.25}>
                      {formatarHora(m.enviadaEm)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Box>

        <Divider />
        <Box p={2}>
          <form onSubmit={enviar} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <IconButton
              aria-label="Emojis"
              onClick={(e) => setAncoraEmoji(e.currentTarget)}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              <IconMoodSmile />
            </IconButton>
            <Popover
              anchorEl={ancoraEmoji}
              open={Boolean(ancoraEmoji)}
              onClose={() => setAncoraEmoji(null)}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Picker
                native
                onEmojiClick={(_evento: unknown, emoji: { emoji: string }) =>
                  setTexto((atual) => (atual + emoji.emoji).slice(0, LIMITES.MENSAGEM_TEXTO))
                }
              />
            </Popover>
            <InputBase
              fullWidth
              multiline
              maxRows={4}
              value={texto}
              disabled={lista === null}
              placeholder="Escreva uma mensagem para a equipe do projeto"
              inputProps={{
                'aria-label': 'Escreva uma mensagem',
                maxLength: LIMITES.MENSAGEM_TEXTO,
              }}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={aoTeclar}
            />
            {restante < 200 ? (
              <Typography variant="caption" color={restante < 20 ? 'error' : 'textSecondary'}>
                {restante}
              </Typography>
            ) : null}
            <IconButton
              aria-label="Enviar"
              type="submit"
              disabled={!texto.trim() || enviando}
              color="primary"
            >
              <IconSend stroke={1.5} size="20" />
            </IconButton>
          </form>
        </Box>
      </Box>
    </BlankCard>
  );
};

export default ChatProjeto;
