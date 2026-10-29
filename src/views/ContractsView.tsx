import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Download, FilePlus2, FileText, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { contractCategories, contractModels } from '../data/contractsCatalog';
import type { ContractModel, GeneratedContract } from '../types';
import { deleteContract, listContracts, saveContract } from '../services/contractsRepository';

interface Props { userId: string | null; onBack: () => void; }
type Screen = 'catalog' | 'editor' | 'document';

const emptyFields = (model: ContractModel) => Object.fromEntries(model.fields.map((field) => [field.key, ''])) as Record<string, string>;

function clauseBody(model: ContractModel, clause: string, fields: Record<string, string>): string {
  const v = (key: string) => fields[key]?.trim() || '[PREENCHER]';
  const name = clause.toLocaleLowerCase('pt-BR');
  if (/objeto|escopo|função|atividade|serviço|obra|destinação/.test(name)) return `O objeto deste instrumento é ${v('objeto')}. A execução ficará limitada ao escopo descrito, e qualquer alteração material dependerá de formalização escrita pelas partes.`;
  if (/salário|remuneração|preço|comissão|bolsa|aluguel|valor|pagamento/.test(name)) return `A contraprestação será ${v('valor')}, com vencimentos, documentos e critérios de apuração compatíveis com o regime jurídico deste contrato. Tributos, encargos e retenções serão tratados conforme a legislação aplicável, sem transferência de obrigação legal indisponível.`;
  if (/prazo|vigência|término|prorrogação/.test(name)) return `A vigência inicia em ${v('inicio')} e observará ${v('prazo')}. Prorrogações, renovações e término antecipado dependerão das hipóteses, formas e limites previstos na legislação específica indicada neste instrumento.`;
  if (/jornada|horário|convocação|intervalo|descanso/.test(name)) {
    if (model.id === 'clt-intermitente') return 'A convocação será realizada por meio de comunicação eficaz, com antecedência mínima de três dias corridos, indicando jornada e período de prestação. O trabalhador terá um dia útil para responder; o silêncio será considerado recusa. A recusa não descaracteriza a subordinação. Ao final de cada período de prestação serão discriminadas e pagas as parcelas previstas no art. 452-A da CLT.';
    if (model.category === 'trabalhista') return 'A jornada, os intervalos, os descansos e o controle de horário observarão os limites constitucionais, a CLT, a legislação especial e a norma coletiva aplicável. Horas extraordinárias e compensações somente serão adotadas nos regimes e limites legalmente admitidos.';
    return 'Os horários de execução e acesso serão definidos por ordem de serviço ou cronograma, sem criar subordinação trabalhista quando a relação for efetivamente civil ou empresarial.';
  }
  if (/garantia|vício|defeito|qualidade/.test(name)) return 'A parte responsável responderá por desconformidades e vícios nos prazos e limites previstos na legislação aplicável, sem prejuízo de garantias legais obrigatórias. A vistoria, o aceite e a comunicação de defeitos deverão ser documentados.';
  if (/entrega|restituição|devolução|vistoria|recebimento/.test(name)) return `A entrega ou restituição será realizada em ${v('local')}, mediante conferência do estado, acessórios e documentos do bem/serviço. As condições verificadas deverão constar de termo ou registro assinado pelas partes.`;
  if (/confidencial|dados|segurança da informação/.test(name)) return 'As partes utilizarão informações e dados pessoais somente para as finalidades legítimas e autorizadas, limitarão o acesso a pessoas que necessitem conhecê-los e adotarão medidas técnicas e administrativas adequadas. Permanecem ressalvados deveres legais de comunicação, fiscalização, exercício de direitos e cooperação com autoridades.';
  if (/rescisão|extinção|resolução|encerramento/.test(name)) return 'A extinção observará aviso, prazos, causas, formalidades, indenizações e verbas previstos no regime jurídico aplicável. Permanecem exigíveis obrigações vencidas, prestação de contas, devolução de bens e deveres que, por sua natureza ou previsão válida, sobrevivam ao término.';
  if (/material|equipamento|ferramenta|conservação|manutenção/.test(name)) return `A parte que receber materiais ou equipamentos deverá utilizá-los exclusivamente na finalidade ajustada, conservar e devolver conforme o estado de recebimento, ressalvado o desgaste normal e as responsabilidades legais de cada parte. Condições específicas: ${v('condicoes')}.`;
  if (/responsabilidade|obrigações|deveres|segurança|licenças|art|normas/.test(name)) return model.parties.map((party) => `${party.party}: ${party.duties}`).join(' ');
  return `As partes executarão esta disposição conforme o objeto (${v('objeto')}), o valor pactuado (${v('valor')}) e as condições específicas (${v('condicoes')}), respeitando as obrigações de cada parte e as normas cogentes do regime ${model.regime}.`;
}

function buildDocument(model: ContractModel, fields: Record<string, string>): string {
  const value = (key: string) => fields[key]?.trim() || '[PREENCHER]';
  const clauses = model.clauses.map((clause, index) => `CLÁUSULA ${index + 1} — ${clause.toUpperCase()}\n${clauseBody(model, clause, fields)}\n`).join('\n');
  const legal = model.sources.map((source) => `• ${source.name}, ${source.articles}. Aplicação: ${source.note}\n  Fonte oficial: ${source.url}`).join('\n');
  const duties = model.parties.map((party) => `${party.party}: ${party.duties}`).join('\n\n');
  return `${model.title.toUpperCase()}\n\nREGIME JURÍDICO: ${model.regime}\n\n1. IDENTIFICAÇÃO DAS PARTES\nPARTE A: ${value('contratante')} — CPF/CNPJ: ${value('documentoContratante')} — Endereço: ${value('enderecoContratante')}\nPARTE B: ${value('contratado')} — CPF/CNPJ: ${value('documentoContratado')} — Endereço: ${value('enderecoContratado')}\n\n2. OBJETO\n${value('objeto')}\nLocal: ${value('local')}\n\n3. PREÇO / REMUNERAÇÃO\n${value('valor')}\n\n4. PRAZO E VIGÊNCIA\nInício: ${value('inicio')}\nPrazo: ${value('prazo')}\n\n5. OBRIGAÇÕES E RESPONSABILIDADES DAS PARTES\n${duties}\n\n6. CLÁUSULAS E CONDIÇÕES\n${clauses}\n\n7. CONDIÇÕES ESPECÍFICAS\n${value('condicoes')}\n\n8. LEGISLAÇÃO APLICÁVEL E FONTES PARA CONFERÊNCIA\n${legal}\n\n9. DISPOSIÇÕES GERAIS\nEste instrumento deve ser interpretado conforme o regime jurídico indicado, a boa-fé e as normas cogentes aplicáveis. A nulidade de disposição específica não implica renúncia a direitos indisponíveis. Alterações deverão ser formalizadas por escrito, respeitadas as exigências legais de forma e registro.\n\n10. ASSINATURAS\nLocal e data: ${value('local')} — ${value('inicio')}\n\nPARTE A: __________________________________________\nPARTE B: __________________________________________\n\nTESTEMUNHA 1: __________________ CPF: __________________\nTESTEMUNHA 2: __________________ CPF: __________________\n\nALERTA: minuta orientativa gerada a partir de modelo geral. Confirme os fatos, a convenção coletiva, legislação especial, documentos e formalidades do caso concreto antes da assinatura. A geração não substitui análise jurídica profissional.\n`;
}

function downloadPdf(contract: GeneratedContract) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const width = 174;
  const lines = pdf.splitTextToSize(contract.content, width);
  let y = 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  for (const line of lines) {
    if (y > 278) { pdf.addPage(); y = 18; }
    pdf.text(line, margin, y);
    y += 4.5;
  }
  pdf.save(`${contract.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
}

export const ContractsView: React.FC<Props> = ({ userId, onBack }) => {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [selected, setSelected] = useState<ContractModel | null>(null);
  const [category, setCategory] = useState('todos');
  const [query, setQuery] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [contracts, setContracts] = useState<GeneratedContract[]>([]);
  const [activeContract, setActiveContract] = useState<GeneratedContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listContracts().then((items) => { if (active) setContracts(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os documentos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const filtered = useMemo(() => contractModels.filter((model) =>
    (category === 'todos' || model.category === category) &&
    `${model.title} ${model.description} ${model.regime}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
  ), [category, query]);

  const start = (model: ContractModel) => {
    setSelected(model); setFields(emptyFields(model)); setScreen('editor'); setError('');
  };

  const updateField = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));

  const generate = async () => {
    if (!selected) return;
    const missing = selected.fields.filter((field) => field.required && !fields[field.key]?.trim());
    if (missing.length) { setError(`Preencha os campos obrigatórios: ${missing.map((field) => field.label).join('; ')}.`); return; }
    const now = new Date().toISOString();
    const contract: GeneratedContract = {
      id: crypto.randomUUID(), modelId: selected.id, title: selected.title,
      content: buildDocument(selected, fields), fields: { ...fields }, createdAt: now, updatedAt: now,
    };
    setSaving(true); setError('');
    try {
      await saveContract(contract);
      setContracts((current) => [contract, ...current.filter((item) => item.id !== contract.id)]);
      setActiveContract(contract); setScreen('document');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o documento.');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await deleteContract(id); setContracts((current) => current.filter((item) => item.id !== id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir.'); }
  };

  const openSaved = (contract: GeneratedContract) => { setActiveContract(contract); setScreen('document'); };
  const titleClass = 'text-lg font-bold text-white';
  const inputClass = 'w-full rounded-xl border border-[#2A3A55] bg-[#101B2D] px-3 py-3 text-sm text-white placeholder:text-[#8191A8] focus:border-[#5B9BFF] focus:outline-none';
  const panelClass = 'rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4';

  return <div className="space-y-5 pb-24">
    <div className="flex items-center justify-between gap-3">
      <button onClick={screen === 'catalog' ? onBack : () => setScreen('catalog')} className="inline-flex items-center gap-2 text-sm text-[#9FB0C8] hover:text-white"><ArrowLeft size={17} /> Voltar</button>
      <div className="flex items-center gap-2 text-[#9FB0C8] text-xs"><FileText size={16} /> Documentos jurídicos</div>
    </div>

    {screen === 'catalog' && <>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#5B9BFF]">ObraEngep · Biblioteca jurídica</p>
        <h1 className={titleClass}>Contratos e documentos</h1>
        <p className="text-sm text-[#9FB0C8]">Modelos orientados por regime jurídico, com fontes oficiais, deveres de cada parte e alertas de aplicação.</p>
      </header>
      <div className={panelClass + ' flex items-start gap-3'}>
        <ShieldAlert className="mt-0.5 shrink-0 text-amber-400" size={20} />
        <p className="text-xs leading-relaxed text-[#C6D2E2]">As minutas são pontos de partida. A classificação depende da realidade dos fatos. Nenhum modelo afasta direitos indisponíveis, normas coletivas, exigências de registro ou formalidades legais.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3.5 text-[#8191A8]" size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar contrato, serviço ou legislação..." className={inputClass + ' pl-10'} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {contractCategories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold ${category === item.id ? 'border-[#5B9BFF] bg-[#1F66D6] text-white' : 'border-[#2A3A55] text-[#9FB0C8]'}`}>{item.label}</button>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((model) => <article key={model.id} className={panelClass + ' flex flex-col gap-3'}>
          <div className="flex items-start justify-between gap-2"><div><h2 className="text-sm font-bold text-white">{model.title}</h2><p className="mt-1 text-xs text-[#9FB0C8]">{model.regime}</p></div><BookOpen size={18} className="shrink-0 text-[#5B9BFF]" /></div>
          <p className="text-xs leading-relaxed text-[#C6D2E2]">{model.description}</p>
          <p className="text-xs text-[#9FB0C8]"><strong className="text-[#DCE6F4]">Quando usar:</strong> {model.when}</p>
          <p className="text-[11px] text-[#8191A8]">{model.sources.length} referências jurídicas · {model.clauses.length} grupos de cláusulas</p>
          <button onClick={() => start(model)} className="mt-auto rounded-xl bg-[#1F66D6] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#2D78EA]">Criar documento</button>
        </article>)}
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white">Meus documentos</h2>
        {loading ? <p className="text-xs text-[#9FB0C8]">Carregando documentos...</p> : contracts.length === 0 ? <p className="text-xs text-[#9FB0C8]">Nenhum documento salvo.</p> : contracts.map((contract) => <div key={contract.id} className={panelClass + ' flex items-center gap-3'}>
          <FileText className="shrink-0 text-[#5B9BFF]" size={19} /><button onClick={() => openSaved(contract)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-white">{contract.title}</span><span className="text-xs text-[#9FB0C8]">{new Date(contract.updatedAt).toLocaleString('pt-BR')}</span></button><button onClick={() => void remove(contract.id)} aria-label="Excluir documento" className="rounded-lg p-2 text-[#9FB0C8] hover:bg-red-500/10 hover:text-red-400"><Trash2 size={17} /></button>
        </div>)}
      </section>
    </>}

    {screen === 'editor' && selected && <>
      <header className="space-y-1"><p className="text-xs text-[#5B9BFF]">{selected.regime}</p><h1 className={titleClass}>{selected.title}</h1><p className="text-sm text-[#9FB0C8]">{selected.when}</p></header>
      <section className={panelClass + ' space-y-3'}>
        <h2 className="text-sm font-bold text-white">Quem participa e quais são as obrigações</h2>
        {selected.parties.map((party) => <div key={party.party} className="rounded-xl bg-[#101B2D] p-3"><h3 className="text-xs font-bold text-[#DCE6F4]">{party.party}</h3><p className="mt-1 text-xs leading-relaxed text-[#9FB0C8]">{party.duties}</p></div>)}
      </section>
      <section className={panelClass + ' space-y-3'}>
        <h2 className="text-sm font-bold text-white">Dados para elaboração</h2>
        {selected.fields.map((field) => <label key={field.key} className="block space-y-1.5"><span className="text-xs font-semibold text-[#C6D2E2]">{field.label}{field.required ? ' *' : ''}</span>{field.multiline ? <textarea rows={3} value={fields[field.key] ?? ''} onChange={(event) => updateField(field.key, event.target.value)} className={inputClass} /> : <input value={fields[field.key] ?? ''} onChange={(event) => updateField(field.key, event.target.value)} className={inputClass} />}</label>)}
      </section>
      <section className={panelClass + ' space-y-3'}>
        <h2 className="text-sm font-bold text-white">Fundamentação jurídica por modelo</h2>
        {selected.sources.map((source) => <div key={source.name + source.articles} className="border-b border-[#2A3A55] pb-3 last:border-0"><p className="text-xs font-bold text-white">{source.name}</p><p className="mt-1 text-xs text-[#9FB0C8]">{source.articles}</p><p className="mt-1 text-xs leading-relaxed text-[#C6D2E2]">{source.note}</p><a href={source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#5B9BFF] underline">Consultar fonte oficial</a></div>)}
      </section>
      <section className={panelClass + ' space-y-2'}>
        <h2 className="text-sm font-bold text-white">Alertas antes de assinar</h2>
        {selected.warnings.map((warning) => <p key={warning} className="text-xs leading-relaxed text-amber-200">• {warning}</p>)}
      </section>
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      <button disabled={saving} onClick={() => void generate()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F66D6] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><FilePlus2 size={17} />{saving ? 'Salvando documento...' : 'Gerar e salvar minuta'}</button>
    </>}

    {screen === 'document' && activeContract && <>
      <header className="space-y-2"><h1 className={titleClass}>{activeContract.title}</h1><p className="text-xs text-[#9FB0C8]">Documento salvo · {new Date(activeContract.updatedAt).toLocaleString('pt-BR')}</p></header>
      <div className={panelClass + ' flex flex-wrap gap-2'}>
        <button onClick={() => downloadPdf(activeContract)} className="inline-flex items-center gap-2 rounded-xl bg-[#1F66D6] px-4 py-2.5 text-xs font-bold text-white"><Download size={16} /> Exportar PDF</button>
        <button onClick={() => { setSelected(contractModels.find((model) => model.id === activeContract.modelId) ?? null); setFields({ ...activeContract.fields }); setScreen('editor'); }} className="inline-flex items-center gap-2 rounded-xl border border-[#2A3A55] px-4 py-2.5 text-xs font-semibold text-white">Editar dados</button>
      </div>
      <article className={panelClass}><pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-[#E3EAF4]">{activeContract.content}</pre></article>
    </>}
    {error && screen !== 'editor' && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
};
