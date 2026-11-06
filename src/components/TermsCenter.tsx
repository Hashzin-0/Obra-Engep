import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

const references = [
  ['Código de Defesa do Consumidor — Lei nº 8.078/1990', 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm'],
  ['Decreto do Comércio Eletrônico — nº 7.962/2013', 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm'],
  ['Marco Civil da Internet — Lei nº 12.965/2014', 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm'],
  ['LGPD — Lei nº 13.709/2018', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm'],
];

export const TermsCenter: React.FC = () => (
  <section className="space-y-4" aria-labelledby="terms-center-title">
    <header className="space-y-1">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#5B9BFF]" aria-hidden="true" />
        <h3 id="terms-center-title" className="text-lg font-bold text-white">Termos de Uso</h3>
      </div>
      <p className="text-xs text-[#9FB0C8]">Condições preliminares de utilização do OBra ENGEP.</p>
    </header>
    <div className="rounded-2xl border border-[#F5B93A]/40 bg-[#3A2E10]/30 p-4 space-y-1" role="note">
      <p className="text-sm font-semibold text-[#F5B93A]">Minuta — ainda não é um contrato definitivo</p>
      <p className="text-xs leading-relaxed text-[#E8EDF5]">O fornecedor, CPF/CNPJ, endereço, canal de atendimento, vigência e processo de aceite serão preenchidos pelo controlador. Até a revisão jurídica e publicação formal, esta tela é informativa e não substitui contrato validamente apresentado e aceito.</p>
    </div>
    <article className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-2 text-xs leading-relaxed text-[#D5DEEA]">
      <h4 className="text-sm font-bold text-white">1. Objeto e uso permitido</h4>
      <p>O OBra ENGEP disponibiliza ferramentas de consulta técnica, organização de projetos, cálculos preliminares, biblioteca, checklists, notas, prazos e recursos de inteligência artificial. Utilize o serviço para fins lícitos e não tente acessar dados de terceiros, contornar controles, explorar vulnerabilidades ou enviar conteúdo malicioso.</p>
      <h4 className="text-sm font-bold text-white pt-2">2. Conta e segurança</h4>
      <p>O acesso pode utilizar sessão anônima ou autenticação por provedor externo. Proteja seu dispositivo e suas sessões. O fluxo de associação de uma sessão anônima a uma conta permanente deve ser explicado quando disponibilizado.</p>
      <h4 className="text-sm font-bold text-white pt-2">3. Limites técnicos e responsabilidade profissional</h4>
      <p>Calculadoras e respostas de IA podem conter estimativas, simplificações ou erros. Confira entradas, unidades, hipóteses, normas vigentes e condições reais. O aplicativo não substitui projeto executivo, vistoria, laudo, ART/RRT, aprovação regulatória ou profissional legalmente habilitado. Nenhuma disposição afasta responsabilidade que a lei não permita excluir, nem direitos inderrogáveis do consumidor.</p>
      <h4 className="text-sm font-bold text-white pt-2">4. Inteligência artificial</h4>
      <p>Respostas geradas por IA são auxiliares e devem ser verificadas. O conteúdo enviado pode ser processado pelo provedor descrito na Política de Privacidade. Não envie senhas, segredos ou dados sensíveis desnecessários.</p>
      <h4 className="text-sm font-bold text-white pt-2">5. Conteúdo e propriedade intelectual</h4>
      <p>O usuário mantém direitos sobre conteúdo próprio, respeitados direitos de terceiros. Código, marca, imagens, fontes, modelos 3D e materiais normativos podem estar sujeitos a licenças distintas. A licença do código não concede direitos sobre conteúdo de terceiros nem autoriza reprodução integral de normas ABNT.</p>
      <h4 className="text-sm font-bold text-white pt-2">6. Disponibilidade e suporte</h4>
      <p>O serviço pode passar por manutenção ou indisponibilidade de fornecedores. A política definitiva deverá explicar comunicação de mudanças, exportação e suporte sem prometer disponibilidade não contratada.</p>
      <h4 className="text-sm font-bold text-white pt-2">7. Preços, cobrança e reembolso</h4>
      <p>Não foi identificado checkout, assinatura ou cobrança no código examinado. Não há preço ou cobrança autorizados por esta minuta. Se planos pagos forem introduzidos, as condições de preço total, renovação, cancelamento, reembolso e arrependimento deverão ser apresentadas antes da contratação, conforme a legislação aplicável.</p>
      <h4 className="text-sm font-bold text-white pt-2">8. Dados pessoais</h4>
      <p>O tratamento de dados é descrito na Central de Privacidade. Os direitos previstos na LGPD devem ser exercidos pelo canal que o controlador configurar. A exclusão observa obrigações legais e prazos de backup.</p>
      <h4 className="text-sm font-bold text-white pt-2">9. Lei aplicável</h4>
      <p>Aplicam-se as leis brasileiras, inclusive LGPD, Marco Civil da Internet e CDC quando caracterizada relação de consumo. Nenhuma cláusula deve restringir o acesso à Justiça ou direitos legais do consumidor.</p>
    </article>
    <div className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-2">
      <h4 className="text-sm font-bold text-white">Legislação oficial</h4>
      {references.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-1 text-xs text-[#8CB8FF] hover:underline"><span>{label}</span><ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /></a>)}
    </div>
  </section>
);
