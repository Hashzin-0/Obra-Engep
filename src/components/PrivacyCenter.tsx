import React, { useCallback, useEffect, useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  FileText,
  Database,
  BrainCircuit,
  Bell,
  Accessibility,
  Download,
  Trash2,
  Send,
  RefreshCw,
} from 'lucide-react';
import {
  createPrivacyRequest,
  deleteOwnAccount,
  downloadAccountData,
  loadPrivacyRecords,
  type ConsentEventRecord,
  type PrivacyRequestRecord,
  type PrivacyRequestType,
} from '../services/privacy';

const legalLinks = [
  { label: 'LGPD — Lei nº 13.709/2018', href: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm' },
  { label: 'Marco Civil da Internet — Lei nº 12.965/2014', href: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm' },
  { label: 'Código de Defesa do Consumidor — Lei nº 8.078/1990', href: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm' },
  { label: 'Lei Brasileira de Inclusão — Lei nº 13.146/2015', href: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm' },
  { label: 'Regulamentos e resoluções da ANPD', href: 'https://www.gov.br/anpd/pt-br/assuntos/legislacao' },
  { label: 'WCAG 2.2 — W3C', href: 'https://www.w3.org/TR/WCAG22/' },
];

const sections = [
  { icon: Database, title: 'Dados tratados e finalidades', body: 'O aplicativo pode tratar dados de autenticação (identificador da conta, nome e e-mail fornecidos pelo provedor), perfil, projetos de planta baixa, cálculos salvos, favoritos, notas, checklists, prazos, produtos cadastrados, feedback e preferências. Esses dados são usados para autenticar, sincronizar, salvar e restaurar o trabalho, prestar suporte e proteger o serviço. Dados mantidos somente no dispositivo podem permanecer no armazenamento local do navegador até que sejam apagados pelo usuário ou pelo próprio navegador.' },
  { icon: ShieldCheck, title: 'Segurança e prevenção de abuso', body: 'O serviço aplica controles de acesso, políticas de segurança no banco, limites de requisições e registros técnicos. Para limitar abuso, alguns fluxos podem processar sinais técnicos como endereço IP e agente do navegador, inclusive em forma de impressão digital criptográfica. Esses sinais não devem ser usados para publicidade comportamental.' },
  { icon: BrainCircuit, title: 'Recursos de inteligência artificial', body: 'Quando o usuário aciona recursos de IA, o conteúdo enviado para análise pode ser processado pelo Google Gemini. Não envie senhas, dados bancários, documentos pessoais ou dados sensíveis de terceiros. A disponibilidade, retenção e uso pelo provedor dependem do produto, plano e termos efetivamente contratados. O responsável deverá confirmar o tipo de faturamento e as condições contratuais da API antes da publicação definitiva.' },
  { icon: Bell, title: 'Notificações e armazenamento no dispositivo', body: 'A ativação de notificações depende de permissão explícita do navegador ou sistema operacional. O aplicativo pode armazenar identificadores técnicos de inscrição push para entregar os avisos solicitados. O PWA também utiliza armazenamento local e service worker para manter preferências, dados offline e recursos de instalação. Não foi identificado Google Analytics ou outro rastreador publicitário no código examinado; essa condição deve ser revalidada antes de cada inclusão de SDK.' },
  { icon: FileText, title: 'Fornecedores e transferências internacionais', body: 'A infraestrutura observada utiliza Supabase para autenticação e banco de dados, Vercel para hospedagem e entrega e Google para autenticação e recursos Gemini. Alguns fornecedores podem processar dados fora do Brasil. O controlador deve manter contratos, instruções de tratamento, suboperadores, países de destino e mecanismo válido de transferência internacional atualizados, conforme a LGPD e a Resolução CD/ANPD nº 19/2024.' },
  { icon: Accessibility, title: 'Direitos e acessibilidade', body: 'O titular pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio, eliminação quando cabível, portabilidade nos termos da regulamentação, informação sobre compartilhamentos, revisão de decisões automatizadas quando aplicável e revogação de consentimento. O atendimento deverá verificar a identidade de forma proporcional e respeitar hipóteses legais de conservação. A interface adota como referência técnica WCAG 2.2 nível AA; isso não representa certificação de acessibilidade.' },
];

const requestLabels: Record<PrivacyRequestType, string> = {
  access: 'Acesso e confirmação de tratamento',
  correction: 'Correção de dados',
  deletion: 'Eliminação de dados',
  portability: 'Portabilidade',
  information: 'Informações sobre compartilhamentos',
  other: 'Outra solicitação',
};

const requestStatusLabels: Record<PrivacyRequestRecord['status'], string> = {
  received: 'Recebida',
  in_progress: 'Em análise',
  completed: 'Concluída',
  rejected: 'Não atendida',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

interface PrivacyCenterProps {
  userId?: string | null;
}

export const PrivacyCenter: React.FC<PrivacyCenterProps> = ({ userId }) => {
  const supportEmail = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL as string | undefined) || '';
  const [requests, setRequests] = useState<PrivacyRequestRecord[]>([]);
  const [consents, setConsents] = useState<ConsentEventRecord[]>([]);
  const [requestType, setRequestType] = useState<PrivacyRequestType>('access');
  const [requestDetails, setRequestDetails] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshRecords = useCallback(async () => {
    if (!userId) return;
    try {
      const records = await loadPrivacyRecords(userId);
      setRequests(records.requests);
      setConsents(records.consents);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');
    }
  }, [userId]);

  useEffect(() => { void refreshRecords(); }, [refreshRecords]);

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || requestBusy) return;
    setRequestBusy(true);
    setFeedback(null);
    try {
      await createPrivacyRequest(userId, requestType, requestDetails);
      setRequestDetails('');
      setFeedback('Solicitação registrada. O status inicial é Recebida; o atendimento depende da equipe responsável.');
      await refreshRecords();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao registrar solicitação.');
    } finally {
      setRequestBusy(false);
    }
  };

  const handleExport = async () => {
    if (!userId || exportBusy) return;
    setExportBusy(true);
    setFeedback(null);
    try {
      await downloadAccountData(userId);
      setFeedback('Arquivo de exportação preparado neste dispositivo.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao exportar os dados.');
    } finally {
      setExportBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId || deleteBusy || deleteConfirmation !== 'EXCLUIR MINHA CONTA') return;
    const accepted = window.confirm('Esta ação é permanente. Projetos, dados da conta e arquivos privados serão excluídos. Deseja continuar?');
    if (!accepted) return;
    setDeleteBusy(true);
    setFeedback(null);
    try {
      await deleteOwnAccount();
      window.location.replace('/');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível excluir a conta.');
      setDeleteBusy(false);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="privacy-center-title">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#3DD68C]" aria-hidden="true" />
          <h3 id="privacy-center-title" className="text-lg font-bold text-white">Privacidade, dados e conformidade</h3>
        </div>
        <p className="text-xs text-[#9FB0C8]">Informações e ferramentas para exercer seus direitos sobre os dados da conta.</p>
      </header>
      <div className="rounded-2xl border border-[#F5B93A]/40 bg-[#3A2E10]/30 p-4 space-y-1" role="note">
        <p className="text-sm font-semibold text-[#F5B93A]">Minuta pendente de identificação do controlador</p>
        <p className="text-xs leading-relaxed text-[#E8EDF5]">Esta é uma versão técnica preliminar baseada nos fluxos identificados no código. A publicação jurídica definitiva depende do preenchimento dos dados do controlador, canal de privacidade, confirmação dos contratos dos fornecedores, bases legais por finalidade e prazos de retenção. Não representa certificação nem parecer jurídico.</p>
      </div>
      <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-2">
        <h4 className="text-sm font-bold text-white">Controlador e canal de privacidade</h4>
        <dl className="grid grid-cols-1 gap-2 text-xs">
          <div><dt className="text-[#9FB0C8]">Responsável legal</dt><dd className="text-white">A configurar pelo responsável do Obra-Engep.</dd></div>
          <div><dt className="text-[#9FB0C8]">CPF/CNPJ e endereço</dt><dd className="text-white">A configurar — não informado nesta versão.</dd></div>
          <div><dt className="text-[#9FB0C8]">Canal para solicitações LGPD</dt><dd className="text-white">{supportEmail || 'A configurar — canal de atendimento ainda não publicado.'}</dd></div>
        </dl>
      </div>
      {sections.map(({ icon: Icon, title, body }) => (
        <article key={title} className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-white"><Icon className="w-4 h-4 text-[#5B9BFF]" aria-hidden="true" />{title}</h4>
          <p className="text-xs leading-relaxed text-[#D5DEEA]">{body}</p>
        </article>
      ))}

      <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white">Seus dados pessoais</h4>
          <button type="button" onClick={() => void refreshRecords()} className="inline-flex items-center gap-1 text-xs text-[#8CB8FF]" disabled={!userId}>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />Atualizar
          </button>
        </div>
        <p className="text-xs leading-relaxed text-[#D5DEEA]">Exporte os registros de nuvem acessíveis à sua conta e os dados locais do OBra ENGEP armazenados neste navegador. O arquivo é JSON e pode conter informações pessoais e conteúdo de projetos; guarde-o em local seguro.</p>
        <button type="button" onClick={() => void handleExport()} disabled={!userId || exportBusy} className="inline-flex items-center gap-2 rounded-xl bg-[#1F66D6] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          <Download className="w-4 h-4" aria-hidden="true" />{exportBusy ? 'Preparando exportação...' : 'Exportar meus dados'}
        </button>
      </div>

      <form onSubmit={handleRequest} className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-3">
        <h4 className="text-sm font-bold text-white">Registrar solicitação LGPD</h4>
        <p className="text-xs leading-relaxed text-[#D5DEEA]">O pedido será associado à conta autenticada. Não inclua senhas, documentos ou dados sensíveis desnecessários na descrição.</p>
        <label className="block space-y-1 text-xs text-[#9FB0C8]">
          <span>Tipo de solicitação</span>
          <select value={requestType} onChange={(event) => setRequestType(event.target.value as PrivacyRequestType)} className="w-full rounded-xl border border-[#435875] bg-[#101827] px-3 py-2.5 text-sm text-white">
            {Object.entries(requestLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-xs text-[#9FB0C8]">
          <span>Detalhes (opcional)</span>
          <textarea value={requestDetails} onChange={(event) => setRequestDetails(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-xl border border-[#435875] bg-[#101827] px-3 py-2.5 text-sm text-white" placeholder="Descreva o pedido de forma objetiva." />
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#9FB0C8]">{requestDetails.length}/2000</span>
          <button type="submit" disabled={!userId || requestBusy} className="inline-flex items-center gap-2 rounded-xl border border-[#5B9BFF]/50 px-3 py-2 text-xs font-semibold text-[#8CB8FF] disabled:opacity-50">
            <Send className="w-3.5 h-3.5" aria-hidden="true" />{requestBusy ? 'Registrando...' : 'Enviar solicitação'}
          </button>
        </div>
      </form>

      {feedback && <p role="status" className="rounded-xl border border-[#3DD68C]/30 bg-[#153327] p-3 text-xs text-[#B7F5D5]">{feedback}</p>}
      {loadError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">{loadError}</p>}

      <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-3">
        <h4 className="text-sm font-bold text-white">Histórico de solicitações</h4>
        {requests.length === 0 ? <p className="text-xs text-[#9FB0C8]">Nenhuma solicitação registrada nesta conta.</p> : requests.map((item) => (
          <article key={item.id} className="border-t border-[#2A3A55] pt-2 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-xs text-white">{requestLabels[item.request_type]}</strong>
              <span className="rounded-full bg-[#26364D] px-2 py-1 text-[10px] text-[#D5DEEA]">{requestStatusLabels[item.status]}</span>
            </div>
            <p className="mt-1 text-[10px] text-[#9FB0C8]">{formatDate(item.created_at)}</p>
            {item.details && <p className="mt-1 whitespace-pre-wrap text-xs text-[#D5DEEA]">{item.details}</p>}
            {item.response_note && <p className="mt-1 text-xs text-[#8CB8FF]">Resposta: {item.response_note}</p>}
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-2">
        <h4 className="text-sm font-bold text-white">Histórico de permissões opcionais</h4>
        <p className="text-xs text-[#9FB0C8]">Registros de ativação e revogação de notificações push neste aplicativo.</p>
        {consents.length === 0 ? <p className="text-xs text-[#9FB0C8]">Nenhuma alteração de permissão registrada.</p> : consents.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 border-t border-[#2A3A55] pt-2 first:border-0 first:pt-0">
            <span className="text-xs text-white">Notificações push — {item.action === 'granted' ? 'ativadas' : 'revogadas'}</span>
            <time className="text-[10px] text-[#9FB0C8]">{formatDate(item.created_at)}</time>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-[#25171B] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-300" aria-hidden="true" />
          <h4 className="text-sm font-bold text-white">Excluir minha conta e dados</h4>
        </div>
        <p className="text-xs leading-relaxed text-[#E8D9DC]">A exclusão remove a conta de autenticação, os registros vinculados por chave estrangeira, os registros de consentimento e solicitações associados e os arquivos privados encontrados no espaço da conta. Dados compartilhados de catálogo e avisos globais não são apagados; a autoria é preservada como nula quando aplicável. Cópias de segurança do provedor seguem o ciclo próprio de retenção.</p>
        <label className="block space-y-1 text-xs text-[#E8D9DC]">
          <span>Digite EXCLUIR MINHA CONTA para habilitar a exclusão</span>
          <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" className="w-full rounded-xl border border-red-400/40 bg-[#130E11] px-3 py-2.5 text-sm text-white" />
        </label>
        <button type="button" onClick={() => void handleDeleteAccount()} disabled={!userId || deleteBusy || deleteConfirmation !== 'EXCLUIR MINHA CONTA'} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
          <Trash2 className="h-4 w-4" aria-hidden="true" />{deleteBusy ? 'Excluindo conta...' : 'Excluir permanentemente'}
        </button>
      </div>

      <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-2">
        <h4 className="text-sm font-bold text-white">Legislação e referências oficiais</h4>
        <ul className="space-y-2">
          {legalLinks.map((item) => <li key={item.href + item.label}><a href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 text-xs text-[#8CB8FF] hover:underline"><span>{item.label}</span><ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /></a></li>)}
        </ul>
      </div>
    </section>
  );
};
