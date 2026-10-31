import { useState } from 'react';
import { Box, Button, Chip, Stack } from '@mui/material';
import { IconBan, IconBuildingStore, IconKey, IconPlus } from '@tabler/icons-react';
import TabelaResponsiva, { Coluna } from 'src/components/compartilhados/TabelaResponsiva';
import MenuAcoes from 'src/components/compartilhados/MenuAcoes';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import { servicoAdministracaoSistema } from 'src/servicos/administracaoSistema';
import type { EmpresaSistema } from 'src/types/administracaoSistema';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarDataHora } from 'src/utils/formatacao';
import DialogoRedefinirSenha from '../usuarios/DialogoRedefinirSenha';
import FormularioEmpresa from './FormularioEmpresa';

const colunas: Coluna<EmpresaSistema>[] = [
  {
    titulo: 'Empresa',
    principal: true,
    valor: (e) => (
      <Box>
        {e.nome}
        {e.cnpj ? (
          <Box component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.8rem' }}>
            {e.cnpj}
          </Box>
        ) : null}
      </Box>
    ),
  },
  {
    titulo: 'Administrador',
    valor: (e) =>
      e.administradorLogin ? (
        <Box>
          {e.administradorNome}
          <Box component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.8rem' }}>
            {e.administradorLogin}
          </Box>
        </Box>
      ) : (
        '—'
      ),
  },
  { titulo: 'Usuários', valor: (e) => `${e.usuariosAtivos} ativo(s) de ${e.usuarios}` },
  { titulo: 'Unidades', valor: (e) => e.unidades },
  {
    titulo: 'Situação',
    valor: (e) => <Chip size="small" label={e.ativo ? 'Ativa' : 'Desativada'} color={e.ativo ? 'success' : 'default'} />,
  },
  { titulo: 'Cadastrada em', valor: (e) => formatarDataHora(e.criadoEm) },
];

/** Empresas que usam o sistema: cada uma isolada das outras, com o próprio administrador. */
const AbaEmpresas = () => {
  const { notificar, confirmar } = useInteracao();
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [senhaDe, setSenhaDe] = useState<{ id: number; nomeCompleto: string } | null>(null);
  const { dados, carregando, erro, recarregar } = useConsulta(() => servicoAdministracaoSistema.empresas(), []);

  const alternarSituacao = async (e: EmpresaSistema) => {
    const texto = e.ativo
      ? `Desativar ${e.nome}? Todos os usuários da empresa perdem o acesso na hora (os dados ficam guardados).`
      : `Reativar ${e.nome}? Os usuários ativos dela voltam a entrar.`;
    if (!(await confirmar(texto, { rotuloConfirmar: e.ativo ? 'Desativar' : 'Reativar', perigo: e.ativo }))) return;
    try {
      await servicoAdministracaoSistema.alterarSituacaoEmpresa(e.id, !e.ativo);
      notificar(e.ativo ? 'Empresa desativada.' : 'Empresa reativada.');
      recarregar();
    } catch (falha) {
      notificar(mensagemDeErro(falha), 'error');
    }
  };

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" mb={3}>
        <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={() => setFormularioAberto(true)}>
          Nova empresa
        </Button>
      </Stack>

      <TabelaResponsiva
        colunas={colunas}
        itens={dados}
        chave={(e) => e.id}
        carregando={carregando}
        erro={erro}
        vazio="Nenhuma empresa cadastrada."
        acoes={(e) => (
          <MenuAcoes
            acoes={[
              {
                rotulo: 'Redefinir senha do administrador',
                icone: <IconKey size={18} />,
                aoClicar: () => setSenhaDe({ id: e.administradorId!, nomeCompleto: e.administradorNome ?? '' }),
                oculta: !e.administradorId,
              },
              {
                rotulo: e.ativo ? 'Desativar empresa' : 'Reativar empresa',
                icone: e.ativo ? <IconBan size={18} /> : <IconBuildingStore size={18} />,
                aoClicar: () => alternarSituacao(e),
                perigo: e.ativo,
              },
            ]}
          />
        )}
      />

      <FormularioEmpresa
        aberto={formularioAberto}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={() => {
          notificar('Empresa cadastrada. Passe o login e a senha para o administrador dela.');
          recarregar();
        }}
      />
      <DialogoRedefinirSenha
        usuario={senhaDe}
        redefinir={servicoAdministracaoSistema.redefinirSenha}
        aoFechar={() => setSenhaDe(null)}
        aoSalvar={() => notificar('Senha redefinida.')}
      />
    </>
  );
};

export default AbaEmpresas;
