import React from 'react';
import { ExternalLink, ShieldCheck, FileText, Database, BrainCircuit, Bell, Accessibility } from 'lucide-react';

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
  { icon: Bell, title: 'Notificações e armazenamento no dispositivo', body: 'A ativação de notificações depende de permissão explícita do navegador ou sistema operacional. O aplicativo pode armazenar identificadores técnicos de inscrição push para entregar os avisos solicitados. O PWA também utiliza armazenamento local, IndexedDB e service worker para manter preferências, dados offline e recursos de instalação. Não foi identificado Google Analytics ou outro rastreador publicitário no código examinado; essa condição deve ser revalidada antes de cada inclusão de SDK.' },
  { icon: FileText, title: 'Fornecedores e transferências internacionais', body: 'A infraestrutura observada utiliza Supabase para autenticação e banco de dados, Vercel para hospedagem e entrega e Google para autenticação e recursos Gemini. Alguns fornecedores podem processar dados fora do Brasil. O controlador deve manter contratos, instruções de tratamento, suboperadores, países de destino e mecanismo válido de transferência internacional atualizados, conforme a LGPD e a Resolução CD/ANPD nº 19/2024.' },
  { icon: Accessibility, title: 'Direitos e acessibilidade', body: 'O titular pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio, eliminação quando cabível, portabilidade nos termos da regulamentação, informação sobre compartilhamentos, revisão de decisões automatizadas quando aplicável e revogação de consentimento. O atendimento deverá verificar a identidade de forma proporcional e respeitar hipóteses legais de conservação. A interface adota como referência técnica WCAG 2.2 nível AA; isso não representa certificação de acessibilidade.' },
];

export const PrivacyCenter: React.FC = () => {
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || '';
  return (
    <section className="space-y-4" aria-labelledby="privacy-center-title">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#3DD68C]" aria-hidden="true" />
          <h3 id="privacy-center-title" className="text-lg font-bold text-white">Privacidade, dados e conformidade</h3>
        </div>
        <p className="text-xs text-[#9FB0C8]">Informações sobre o tratamento de dados no OBra ENGEP.</p>
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
      <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-2">
        <h4 className="text-sm font-bold text-white">Solicitações dos titulares</h4>
        <p className="text-xs leading-relaxed text-[#D5DEEA]">Para exercer seus direitos, utilize o canal de privacidade indicado acima. O atendimento deverá registrar a solicitação, confirmar a identidade de forma proporcional, avaliar a base legal e responder nos prazos aplicáveis. A exclusão de uma conta pode estar sujeita à conservação de registros exigida por lei e não apaga automaticamente cópias de segurança ou dados que devam ser mantidos por obrigação legal.</p>
        {supportEmail && <a href={'mailto:' + supportEmail + '?subject=Solicitação%20de%20privacidade%20—%20LGPD'} className="inline-flex items-center gap-2 rounded-xl border border-[#5B9BFF]/50 px-3 py-2 text-xs font-semibold text-[#8CB8FF] hover:bg-[#1F66D6]/15"><ExternalLink className="w-3.5 h-3.5" />Solicitar atendimento de privacidade</a>}
      </div>
      <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-3">
        <h4 className="text-sm font-bold text-white">Legislação e referências oficiais</h4>
        <ul className="space-y-2">
          {legalLinks.map((item) => <li key={item.href + item.label}><a href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 text-xs text-[#8CB8FF] hover:underline"><span>{item.label}</span><ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /></a></li>)}
        </ul>
      </div>
    </section>
  );
};
