import React, { useMemo, useState } from 'react';
import { Calculator, Info, Search } from 'lucide-react';
import { LimitBar } from '../components/LimitBar';

export type ElectricalReferenceTool = { id: string; title: string; subtitle: string; group: string };
export const ELECTRICAL_REFERENCE_TOOLS: ElectricalReferenceTool[] = [
  {id:'awg_mm2',title:'AWG para mm²',subtitle:'Conversão de bitolas AWG para seção métrica.',group:'Bitolas e cabos'},
  {id:'mm2_awg',title:'mm² para AWG',subtitle:'Bitola AWG mais próxima da seção informada.',group:'Bitolas e cabos'},
  {id:'kcmil_mm2',title:'kcmil para mm²',subtitle:'Converte kcmil para milímetros quadrados.',group:'Bitolas e cabos'},
  {id:'circular_mil_mm2',title:'Circular Mil para mm²',subtitle:'Converte circular mil para seção métrica.',group:'Bitolas e cabos'},
  {id:'cable_size',title:'Tabela de Tamanho de Cabos',subtitle:'Consulta de bitolas métricas, AWG, diâmetro e resistência.',group:'Bitolas e cabos'},
  {id:'wire_gauge',title:'Tabela de bitola de fios',subtitle:'Diâmetro, seção e resistência nominal aproximada.',group:'Bitolas e cabos'},
  {id:'ampacity_table',title:'Tabela de Capacidade de Corrente de Cabos',subtitle:'Referência indicativa de ampacidade por seção.',group:'Bitolas e cabos'},
  {id:'copper_resistance',title:'Tabela de Resistência de Fio de Cobre',subtitle:'Resistência estimada por quilômetro a 20 °C.',group:'Bitolas e cabos'},
  {id:'aluminum_resistance',title:'Tabela de Resistência de Fios de Alumínio',subtitle:'Resistência estimada por quilômetro a 20 °C.',group:'Bitolas e cabos'},
  {id:'voltage_drop',title:'Tabela de Queda de Tensão de Cabos',subtitle:'Estimativa resistiva de queda de tensão.',group:'Bitolas e cabos'},
  {id:'derating',title:'Tabela de Fator de Redução de Capacidade de Cabos',subtitle:'Fatores de correção indicativos.',group:'Bitolas e cabos'},
  {id:'metal_conduit',title:'Tabela de Tamanhos de Eletrodutos Metálicos',subtitle:'Dimensões nominais usuais.',group:'Infraestrutura'},
  {id:'conduit_fill',title:'Tabela de Capacidade de Preenchimento de Eletrodutos',subtitle:'Estimativa geométrica de ocupação.',group:'Infraestrutura'},
  {id:'junction_box',title:'Tabela de Tamanhos de Caixas de Passagem',subtitle:'Dimensões usuais e notas de aplicação.',group:'Infraestrutura'},
  {id:'switch_box',title:'Tabela de Tamanhos de Caixas de Interruptores',subtitle:'Dimensões usuais de caixas de embutir.',group:'Infraestrutura'},
  {id:'distribution_board',title:'Tabela de Tamanhos de Quadro de Distribuição (QD)',subtitle:'Estimativa inicial de módulos DIN.',group:'Infraestrutura'},
  {id:'cable_gland',title:'Tabela de Tamanhos de Prensa-cabos',subtitle:'Faixas indicativas de diâmetro externo.',group:'Infraestrutura'},
  {id:'cable_tray',title:'Tabela de Tamanhos de Leito de Cabos',subtitle:'Estimativa de largura por ocupação.',group:'Infraestrutura'},
  {id:'busbar',title:'Tabela de tamanhos de barramento',subtitle:'Dimensões usuais; corrente depende do projeto térmico.',group:'Infraestrutura'},
  {id:'ground_rod',title:'Tabela de Tamanho de Haste de Aterramento',subtitle:'Dimensões usuais para consulta.',group:'Infraestrutura'},
  {id:'mounting_height',title:'Tabela de Alturas de Montagem Padrão',subtitle:'Referências de alturas de instalação.',group:'Infraestrutura'},
  {id:'motor_flc',title:'Tabela de Corrente de Plena Carga (FLC) do Motor',subtitle:'Estimativa de corrente por potência e tensão.',group:'Motores e proteção'},
  {id:'transformer_current',title:'Tabela de Corrente de Transformador',subtitle:'Corrente nominal estimada por kVA e tensão.',group:'Motores e proteção'},
  {id:'transformer_kva',title:'Tabela de kVA de Transformadores',subtitle:'Potência aparente monofásica ou trifásica.',group:'Motores e proteção'},
  {id:'wire_colors_standard',title:'Tabela de Cores Padrão de Fios',subtitle:'Identificação de condutores por função.',group:'Cores e normas'},
  {id:'installation_distances',title:'Tabela de Distâncias de Instalação Padrão',subtitle:'Referências de separação e afastamento.',group:'Infraestrutura'},
  {id:'iec_colors',title:'Código de Cores de Fios IEC (Padrão Internacional)',subtitle:'Convenções usuais IEC.',group:'Cores e normas'},
  {id:'nec_colors',title:'Código de Cores de Fios NEC (EUA)',subtitle:'Convenções comuns norte-americanas.',group:'Cores e normas'},
  {id:'uk_colors',title:'Código de Cores de Fios do Reino Unido',subtitle:'Cores atuais e referências legadas.',group:'Cores e normas'},
  {id:'europe_colors',title:'Código de Cores de Fios Europeu',subtitle:'Cores harmonizadas usuais.',group:'Cores e normas'},
  {id:'india_colors',title:'Código de Cores de Fios da Índia',subtitle:'Consulta indicativa sujeita ao padrão local.',group:'Cores e normas'},
  {id:'pakistan_colors',title:'Código de Cores de Fios do Paquistão',subtitle:'Consulta indicativa sujeita ao padrão local.',group:'Cores e normas'},
  {id:'au_nz_colors',title:'Código de Cores de Fios da Austrália e Nova Zelândia',subtitle:'Identificação de fase, neutro e proteção.',group:'Cores e normas'},
  {id:'single_phase_colors',title:'Tabela de cores de fios monofásicos',subtitle:'Referência por função em circuitos monofásicos.',group:'Cores e normas'},
  {id:'three_phase_colors',title:'Tabela de Cores de Fios Trifásicos',subtitle:'Fases, neutro e proteção.',group:'Cores e normas'},
  {id:'dc_colors',title:'Tabela de Código de Cores de Fios CC',subtitle:'Convenções indicativas de positivo e negativo.',group:'Cores e normas'},
  {id:'live_colors',title:'Tabela de Cores de Fios Fase (Vivo)',subtitle:'Cores de fase por convenção regional.',group:'Cores e normas'},
  {id:'neutral_colors',title:'Tabela de Cores de Fios Neutros',subtitle:'Identificação do neutro.',group:'Cores e normas'},
  {id:'earth_colors',title:'Tabela de Cores de Fios de Terra (Aterramento)',subtitle:'Identificação do condutor de proteção.',group:'Cores e normas'},
  {id:'old_new_colors',title:'Comparação de cores de fios antigos vs novos',subtitle:'Comparação de convenções legadas e atuais.',group:'Cores e normas'},
  {id:'international_colors',title:'Tabela de Comparação Internacional de Cores de Fios',subtitle:'Comparação de convenções regionais.',group:'Cores e normas'},
  {id:'color_guide',title:'Guia de Identificação de Cores de Fios',subtitle:'Guia rápido por função elétrica.',group:'Cores e normas'},
  {id:'color_safety',title:'Regras de Segurança para Cores de Fios',subtitle:'Cuidados ao identificar condutores.',group:'Cores e normas'},
  {id:'color_errors',title:'Erros Comuns de Cores de Fios',subtitle:'Erros de identificação e prevenção.',group:'Cores e normas'},
  {id:'awg_conversion',title:'Tabela de Conversão AWG',subtitle:'Conversão entre AWG, diâmetro e seção.',group:'Bitolas e cabos'},
  {id:'resistivity',title:'Resistividade dos materiais',subtitle:'Valores típicos de resistividade a 20 °C.',group:'Materiais e unidades'},
  {id:'insulation_class',title:'Classificação de isolamento',subtitle:'Classes térmicas de isolação.',group:'Materiais e unidades'},
  {id:'iec_duty',title:'Ciclo de trabalho IEC 60034-1',subtitle:'Resumo dos regimes de serviço de motores.',group:'Motores e proteção'},
  {id:'si_units',title:'Unidades derivadas do SI',subtitle:'Unidades elétricas e mecânicas derivadas.',group:'Materiais e unidades'},
  {id:'fuse_application',title:'Aplicativo de fusíveis',subtitle:'Referência inicial de aplicação de fusíveis.',group:'Motores e proteção'},
  {id:'fuse_classification',title:'Tabela de Classificação de Fusíveis',subtitle:'Categorias de fusíveis e aplicações típicas.',group:'Motores e proteção'},
  {id:'iec60320',title:'IEC60320',subtitle:'Famílias comuns de conectores de aparelhos.',group:'Materiais e unidades'},
  {id:'cable_reactance',title:'Reatância do cabo',subtitle:'Estimativa de reatância indutiva.',group:'Bitolas e cabos'},
  {id:'resistor_standard',title:'Resistor Padrão',subtitle:'Valor comercial E12 mais próximo.',group:'Materiais e unidades'},
  {id:'ansi_devices',title:'Números de dispositivos ANSI',subtitle:'Funções de proteção ANSI/IEEE C37.2.',group:'Motores e proteção'},
  {id:'thermocouple_colors',title:'Código de cores do termopar',subtitle:'Referência de cores por tipo e padrão.',group:'Materiais e unidades'},
  {id:'capacitor_colors',title:'Código de cores do capacitor',subtitle:'Guia de leitura de marcações de capacitores.',group:'Materiais e unidades'},
  {id:'country_voltage',title:'Tensões por país',subtitle:'Tensão nominal e frequência de rede.',group:'Materiais e unidades'},
  {id:'fuse_class_ul_csa',title:'Classe de fusíveis UL/CSA',subtitle:'Resumo das famílias de fusíveis.',group:'Motores e proteção'},
  {id:'breaker_classes',title:'Tabela de Classificação de Disjuntores (MCB)',subtitle:'Curvas B, C e D.',group:'Motores e proteção'},
  {id:'mccb_classes',title:'Tabela de classificação de MCCB',subtitle:'Parâmetros de disjuntores em caixa moldada.',group:'Motores e proteção'},
  {id:'rccb_rcbo',title:'Tabela de Classificação de RCCB / RCBO',subtitle:'Proteção diferencial e sobrecorrente.',group:'Motores e proteção'},
  {id:'breaker_selection',title:'Tabela de Seleção de Disjuntores',subtitle:'Critérios para selecionar proteção.',group:'Motores e proteção'},
  {id:'short_circuit',title:'Tabela de capacidade de curto-circuito',subtitle:'Estimativa de corrente de falta por impedância.',group:'Motores e proteção'},
  {id:'pvc_conduit',title:'Tabela de Tamanhos de Eletrodutos de PVC',subtitle:'Diâmetros nominais usuais.',group:'Infraestrutura'},
  {id:'energy_saving_devices',title:'Dispositivos de economia de energia',subtitle:'Sensores, temporizadores, dimmers e controles de demanda.',group:'Instalações e dispositivos'},
  {id:'conduit_reference',title:'Eletroduto',subtitle:'Tipos, aplicações e critérios de seleção de eletrodutos.',group:'Infraestrutura'},
  {id:'wire_gauge_reference',title:'Bitola',subtitle:'Seção, capacidade, resistência e critérios de escolha do condutor.',group:'Bitolas e cabos'},
  {id:'surge_protector',title:'Protetor contra surtos (DPS)',subtitle:'Tipos, localização e parâmetros básicos de DPS.',group:'Motores e proteção'},
  {id:'switches_reference',title:'Interruptores',subtitle:'Tipos de interruptores e aplicações em circuitos.',group:'Instalações e dispositivos'},
  {id:'outlets_reference',title:'Tomadas',subtitle:'Tipos, corrente nominal e cuidados de dimensionamento.',group:'Instalações e dispositivos'},
  {id:'load_center',title:'Centro de carga',subtitle:'Componentes e critérios de dimensionamento de quadros.',group:'Infraestrutura'},
  {id:'service_box',title:'Caixa de Serviço',subtitle:'Função, componentes e verificações da caixa de entrada/medição.',group:'Infraestrutura'},
  {id:'turbogenerator',title:'Turbogerador',subtitle:'Componentes e grandezas de geração elétrica.',group:'Máquinas elétricas'},
  {id:'kwh',title:'Quilowatt-hora (kWh)',subtitle:'Energia consumida: potência em kW multiplicada pelo tempo.',group:'Grandezas e fórmulas'},
  {id:'lenz_law',title:'Lei de Lenz',subtitle:'Sentido da força eletromotriz induzida.',group:'Grandezas e fórmulas'},
  {id:'ohm_unit',title:'Ohm (Ω)',subtitle:'Unidade SI da resistência elétrica.',group:'Grandezas e fórmulas'},
  {id:'ohms_law',title:'Lei de Ohm',subtitle:'Calcula tensão, corrente ou resistência pela relação V = R × I.',group:'Grandezas e fórmulas'},
  {id:'power',title:'Potência elétrica',subtitle:'Relações de potência CC e CA monofásica.',group:'Grandezas e fórmulas'},
  {id:'reactive_power',title:'Potência Reativa (var)',subtitle:'Potência reativa em sistemas CA.',group:'Grandezas e fórmulas'},
  {id:'resistance',title:'Resistência (Ω)',subtitle:'Lei de Ohm e resistência de condutores.',group:'Grandezas e fórmulas'},
  {id:'admittance',title:'Admitância (S)',subtitle:'Inverso da impedância em circuitos CA.',group:'Grandezas e fórmulas'},
  {id:'real_power',title:'Potência Real (W)',subtitle:'Potência ativa a partir de tensão, corrente e fator de potência.',group:'Grandezas e fórmulas'},
  {id:'service_entrance',title:'Serviço elétrico',subtitle:'Elementos típicos do ponto de entrega e entrada de energia.',group:'Infraestrutura'},
  {id:'service_drop',title:'Ramal de Serviço',subtitle:'Diferença entre ramal de ligação e ramal de entrada.',group:'Infraestrutura'},
  {id:'semiconductor',title:'Semicondutor',subtitle:'Materiais e comportamento básico de semicondutores.',group:'Eletrônica'},
  {id:'scr',title:'SCR (Retificador controlado de silício)',subtitle:'Princípio de disparo e aplicações de tiristores.',group:'Eletrônica'},
  {id:'solenoid',title:'Solenoide',subtitle:'Campo magnético e força eletromagnética em bobinas.',group:'Máquinas elétricas'},
  {id:'switch',title:'Interruptor',subtitle:'Função de comando e tipos de contatos.',group:'Instalações e dispositivos'},
  {id:'switchgear',title:'Equipamento de manobra (Switchgear)',subtitle:'Conjunto de manobra, proteção e seccionamento.',group:'Motores e proteção'},
  {id:'transistor',title:'Transistor',subtitle:'Chaveamento e amplificação eletrônica.',group:'Eletrônica'},
  {id:'apparent_power',title:'Potência Aparente (VA)',subtitle:'Relação entre tensão eficaz, corrente e fator de potência.',group:'Grandezas e fórmulas'},
  {id:'circuit',title:'Circuito elétrico',subtitle:'Elementos básicos e grandezas de um circuito.',group:'Grandezas e fórmulas'},
  {id:'breaker',title:'Disjuntor',subtitle:'Proteção contra sobrecorrente e critérios de seleção.',group:'Motores e proteção'},
  {id:'conductor',title:'Condutor elétrico',subtitle:'Materiais, seção e critérios de aplicação.',group:'Bitolas e cabos'},
  {id:'digital_multimeter',title:'Multímetro digital (DMM)',subtitle:'Funções, categorias CAT e cuidados de medição.',group:'Instrumentação'},
  {id:'diode',title:'Diodo',subtitle:'Polarização direta/reversa e aplicações.',group:'Eletrônica'},
  {id:'generator',title:'Gerador elétrico',subtitle:'Conversão eletromecânica e grandezas de saída.',group:'Máquinas elétricas'},
  {id:'rcd',title:'IDR (Interruptor Diferencial Residual)',subtitle:'Proteção diferencial e limitações.',group:'Motores e proteção'},
  {id:'inverter',title:'Inversor',subtitle:'Conversão CC/CA e parâmetros de seleção.',group:'Máquinas elétricas'},
  {id:'insulator',title:'Isolante elétrico',subtitle:'Materiais isolantes e propriedades dielétricas.',group:'Materiais e unidades'},
  {id:'parallel_circuit',title:'Circuito em paralelo',subtitle:'Tensão comum e correntes por ramo.',group:'Grandezas e fórmulas'},
  {id:'rectifier',title:'Retificador',subtitle:'Conversão CA/CC e tipos de retificação.',group:'Eletrônica'},
  {id:'series_circuit',title:'Circuito em série',subtitle:'Corrente comum e soma das quedas de tensão.',group:'Grandezas e fórmulas'},
  {id:'series_parallel_circuit',title:'Circuito série-paralelo',subtitle:'Equivalência de resistores em associações mistas.',group:'Grandezas e fórmulas'},
  {id:'short_circuit_reference',title:'Curto-circuito',subtitle:'Causas, corrente de falta e proteção.',group:'Motores e proteção'},
  {id:'ammeter',title:'Amperímetro',subtitle:'Medição de corrente e conexão correta.',group:'Instrumentação'},
  {id:'afci',title:'AFCI (proteção contra falha de arco)',subtitle:'Detecção de arcos elétricos perigosos; adoção depende da norma local.',group:'Motores e proteção'},
  {id:'capacitor',title:'Capacitor',subtitle:'Capacitância, energia armazenada e reatância capacitiva.',group:'Eletrônica'},
  {id:'vars',title:'VARS (volt-ampere reativo)',subtitle:'Unidade de potência reativa.',group:'Grandezas e fórmulas'},
  {id:'volt_ampere',title:'Volt-ampere (VA)',subtitle:'Unidade de potência aparente.',group:'Grandezas e fórmulas'},
  {id:'volt',title:'Volt (V)',subtitle:'Unidade SI de tensão elétrica.',group:'Grandezas e fórmulas'},
  {id:'voltage',title:'Tensão elétrica (E/V)',subtitle:'Diferença de potencial e Lei de Ohm.',group:'Grandezas e fórmulas'},
  {id:'watt_hour',title:'Watt-hora (Wh)',subtitle:'Energia elétrica em função da potência e tempo.',group:'Grandezas e fórmulas'},
  {id:'watt',title:'Watt (W)',subtitle:'Unidade SI de potência.',group:'Grandezas e fórmulas'},
  {id:'manual_bender',title:'Curvador manual',subtitle:'Uso de curvadores e raio de curvatura de eletrodutos.',group:'Infraestrutura'},
  {id:'four_bend_saddle',title:'Curva de quatro dobras',subtitle:'Sequência de marcações para desvio em eletroduto.',group:'Infraestrutura'},
  {id:'three_bend_saddle',title:'Sela de três curvas',subtitle:'Cálculo básico de marcações para contornar obstáculos.',group:'Infraestrutura'},
  {id:'ac',title:'CA (Corrente Alternada)',subtitle:'Grandezas RMS, frequência e potência em CA.',group:'Grandezas e fórmulas'},
  {id:'dc',title:'CC (Corrente Contínua)',subtitle:'Tensão, corrente e potência em circuitos CC.',group:'Grandezas e fórmulas'},
  {id:'feeder',title:'Alimentador',subtitle:'Critérios gerais de circuitos alimentadores.',group:'Infraestrutura'},
  {id:'distribution_pole',title:'Pilar de distribuição',subtitle:'Componentes e função de estruturas de distribuição.',group:'Infraestrutura'},
  {id:'fuse',title:'Fusível',subtitle:'Corrente nominal, curva tempo-corrente e capacidade de interrupção.',group:'Motores e proteção'},
  {id:'ground',title:'Terra (aterramento)',subtitle:'Funções do aterramento e condutor de proteção.',group:'Instalações e dispositivos'},
  {id:'ground_fault',title:'Falha de aterramento',subtitle:'Sinais, riscos e métodos de verificação.',group:'Segurança elétrica'},
  {id:'grounded_conductor',title:'Condutor aterrado',subtitle:'Diferença entre condutor aterrado, neutro e proteção.',group:'Segurança elétrica'},
  {id:'grounding',title:'Aterramento',subtitle:'Eletrodo, condutor de proteção e equipotencialização.',group:'Instalações e dispositivos'},
  {id:'ground_fault_repeat',title:'Falha de aterramento (repetição)',subtitle:'Checklist de investigação de falhas recorrentes.',group:'Segurança elétrica'},
  {id:'punch_set',title:'Conjunto de punções',subtitle:'Uso seguro de punções para abertura de painéis.',group:'Ferramentas'},
  {id:'load',title:'Carga elétrica',subtitle:'Potência, corrente e fator de potência da carga.',group:'Grandezas e fórmulas'},
  {id:'neutral_conductor',title:'Condutor neutro',subtitle:'Função, dimensionamento e cuidados do neutro.',group:'Instalações e dispositivos'},
  {id:'overload',title:'Sobrecarga',subtitle:'Diferença entre sobrecarga e curto-circuito.',group:'Segurança elétrica'},
  {id:'ampere',title:'Ampere (A)',subtitle:'Unidade SI da corrente elétrica.',group:'Grandezas e fórmulas'},
  {id:'capacitance',title:'Capacitância',subtitle:'Relação entre carga e tensão: C = Q/V.',group:'Grandezas e fórmulas'},
  {id:'current',title:'Corrente elétrica (I)',subtitle:'Corrente a partir de carga, potência ou Lei de Ohm.',group:'Grandezas e fórmulas'},
  {id:'demand',title:'Demanda elétrica',subtitle:'Potência média demandada e fator de demanda.',group:'Grandezas e fórmulas'},
  {id:'farad',title:'Farad (F)',subtitle:'Unidade SI de capacitância.',group:'Grandezas e fórmulas'},
  {id:'frequency',title:'Frequência (f)',subtitle:'Ciclos por segundo e período.',group:'Grandezas e fórmulas'},
  {id:'henry',title:'Henry (H)',subtitle:'Unidade SI de indutância.',group:'Grandezas e fórmulas'},
  {id:'hertz',title:'Hertz (Hz)',subtitle:'Unidade SI de frequência.',group:'Grandezas e fórmulas'},
  {id:'impedance',title:'Impedância (Z)',subtitle:'Módulo de impedância e relação fasorial básica.',group:'Grandezas e fórmulas'},
  {id:'gain',title:'Ganho elétrico',subtitle:'Ganho de tensão/corrente e conversão para decibéis.',group:'Eletrônica'},
  {id:'shrink',title:'Encolher (shrink) em curvas',subtitle:'Fator de encurtamento ao fazer desvio em eletroduto.',group:'Infraestrutura'},
  {id:'electric_arc',title:'Arco elétrico',subtitle:'Risco, causas e prevenção de arco elétrico.',group:'Segurança elétrica'},
  {id:'arc_flash',title:'Explosão de arco (arc flash)',subtitle:'Risco térmico e controles de segurança.',group:'Segurança elétrica'},
  {id:'calorie',title:'Caloria',subtitle:'Conversão de energia térmica; 1 cal ≈ 4,184 J.',group:'Grandezas e fórmulas'},
  {id:'construction_electrician',title:'CE (Eletricista de Construção)',subtitle:'Referência de terminologia profissional; escopo varia por jurisdição.',group:'Profissões e segurança'},
  {id:'inductance',title:'Indutância',subtitle:'Relação entre fluxo magnético e corrente.',group:'Grandezas e fórmulas'},
  {id:'load_rejection',title:'Rejeição de carga',subtitle:'Resposta de geradores/turbinas à perda súbita de carga.',group:'Máquinas elétricas'},
];

const awgAreas: Record<number, number> = {0:53.5,1:42.4,2:33.6,3:26.7,4:21.2,5:16.8,6:13.3,7:10.5,8:8.37,9:6.63,10:5.26,11:4.17,12:3.31,13:2.62,14:2.08,15:1.65,16:1.31,17:1.04,18:0.823,19:0.653,20:0.518,21:0.410,22:0.326,23:0.258,24:0.205,25:0.162,26:0.129,27:0.102,28:0.081,29:0.0642,30:0.0509,31:0.0404,32:0.032,33:0.0254,34:0.0201,35:0.016,36:0.0127,37:0.01,38:0.008,39:0.0063,40:0.005};
const fmt = (v:number,d=3) => Number.isFinite(v) ? v.toLocaleString('pt-BR',{maximumFractionDigits:d}) : '—';
const panel = 'rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 space-y-3';
const field = 'w-full rounded-xl border border-[#40516d] bg-[#101827] px-3 py-3 text-sm text-white';
const label = 'block text-xs text-[#9FB0C8] mb-1.5';
const Metric: React.FC<{label:string;value:string;hint?:string}> = ({label,value,hint}) => <div className="rounded-xl border border-[#2A3A55] bg-black/20 p-3"><div className="text-xs text-[#9FB0C8]">{label}</div><div className="mt-1 break-words font-semibold text-white">{value}</div>{hint&&<div className="mt-1 text-[11px] text-[#9FB0C8]">{hint}</div>}</div>;
type Row = [string,string,string];
const tables: Record<string,Row[]> = {
  iec_colors:[['Fase L1','Marrom','IEC usual; confirmar instalação'],['Fase L2','Preto','IEC usual; confirmar instalação'],['Fase L3','Cinza','IEC usual; confirmar instalação'],['Neutro N','Azul-claro','Neutro'],['Proteção PE','Verde/amarelo','Uso exclusivo de proteção']],
  europe_colors:[['Fase','Marrom / preto / cinza','Convenção harmonizada'],['Neutro','Azul','Neutro'],['Proteção','Verde/amarelo','Terra de proteção']],
  uk_colors:[['Fase atual','Marrom','Sistema harmonizado'],['Neutro atual','Azul','Sistema harmonizado'],['Fase antiga','Vermelho','Instalação legada; pode variar'],['Neutro antigo','Preto','Instalação legada; pode variar'],['Terra','Verde/amarelo','Proteção']],
  nec_colors:[['Fase AC comum','Preto / vermelho / azul','Depende do sistema'],['Neutro aterrado','Branco / cinza','Conforme NEC e aplicação'],['Terra de equipamento','Verde / verde-amarelo / nu','Proteção']],
  au_nz_colors:[['Fase','Marrom (convenção comum atual)','Verificar AS/NZS'],['Neutro','Azul-claro','Verificar AS/NZS'],['Terra','Verde/amarelo','Proteção']],
  india_colors:[['Fase','Vermelho / amarelo / azul (convenções encontradas)','Confirmar padrão local'],['Neutro','Preto ou azul conforme padrão/época','Confirmar instalação'],['Terra','Verde / verde-amarelo','Proteção']],
  pakistan_colors:[['Fase','Vermelho / amarelo / azul (convenções encontradas)','Confirmar padrão local'],['Neutro','Preto ou azul conforme padrão/época','Confirmar instalação'],['Terra','Verde / verde-amarelo','Proteção']],
  wire_colors_standard:[['Fase','Marrom / preto / cinza (IEC)','Confirmar padrão local'],['Neutro','Azul-claro (IEC)','Confirmar padrão local'],['PE','Verde/amarelo (IEC)','Uso exclusivo de proteção']],
  single_phase_colors:[['Fase','Conforme norma e instalação','Identificar e testar'],['Neutro','Conforme norma e instalação','Identificar e testar'],['Proteção PE','Verde/amarelo em sistemas IEC','Confirmar padrão local']],
  three_phase_colors:[['L1','Marrom (IEC)','Confirmar norma local'],['L2','Preto (IEC)','Confirmar norma local'],['L3','Cinza (IEC)','Confirmar norma local'],['N','Azul-claro (IEC)','Se presente'],['PE','Verde/amarelo (IEC)','Proteção']],
  dc_colors:[['Positivo','Vermelho (convenção comum)','Verificar documentação'],['Negativo/retorno','Preto ou azul (depende do sistema)','Verificar documentação'],['Terra/chassi','Conforme norma do sistema','Não confundir com negativo']],
  live_colors:[['Fase AC IEC atual','Marrom / preto / cinza','A função depende do circuito'],['Fase AC legado','Pode variar por país e época','Não confiar apenas na cor']],
  neutral_colors:[['Neutro IEC atual','Azul-claro','Confirmar ausência de tensão'],['Neutro em instalações antigas','Pode variar','Rastrear e testar']],
  earth_colors:[['Condutor de proteção IEC','Verde/amarelo','Uso exclusivo de proteção'],['Aterramento funcional','Conforme projeto e norma','Não substitui PE']],
  old_new_colors:[['IEC atual - fase','Marrom / preto / cinza','Sistema harmonizado'],['IEC atual - neutro','Azul-claro','Sistema harmonizado'],['IEC antigo - fase','Vermelho em alguns países','Pode variar'],['IEC antigo - neutro','Preto em alguns países','Pode variar'],['Proteção','Verde/amarelo','Confirmar continuidade']],
  international_colors:[['IEC / Europa','L1 marrom, L2 preto, L3 cinza; N azul; PE verde/amarelo','Varia por país'],['NEC / EUA','Fases frequentemente preto/vermelho/azul; neutro branco/cinza','Varia por sistema'],['Reino Unido atual','Fase marrom; neutro azul; PE verde/amarelo','Legado pode divergir'],['Austrália/NZ','Consultar AS/NZS','Não generalizar cores']],
  color_guide:[['Fase','Consultar norma local','Nunca identificar apenas pela cor'],['Neutro','Consultar norma local','Pode estar energizado em falha'],['PE','Verde/amarelo em IEC','Verificar continuidade']],
  color_safety:[['1','Desenergizar, bloquear e sinalizar','Aplicar procedimento de segurança'],['2','Verificar ausência de tensão','Testar o instrumento antes e depois'],['3','Confirmar continuidade e origem','Não confiar somente na cor'],['4','Documentar e etiquetar','Seguir NR-10 e regras locais']],
  color_errors:[['Erro','Risco','Prevenção'],['Usar cor como única identificação','Choque ou ligação errada','Rastrear e testar'],['Reaproveitar PE como fase','Risco grave','Não alterar função do PE'],['Ignorar instalação antiga','Identificação incorreta','Inspecionar e documentar']],
  insulation_class:[['A','105 °C','Classe térmica tradicional'],['E','120 °C','Classe térmica tradicional'],['B','130 °C','Classe térmica tradicional'],['F','155 °C','Classe térmica tradicional'],['H','180 °C','Classe térmica tradicional']],
  iec_duty:[['S1','Serviço contínuo','Carga constante até equilíbrio térmico'],['S2','Curta duração','Operação limitada seguida de repouso'],['S3','Intermitente periódico','Ciclos com partidas sem influência térmica significativa'],['S4','Intermitente com partida','Ciclos incluem perdas de partida'],['S5','Intermitente com frenagem elétrica','Partida e frenagem incluídas'],['S6','Contínuo periódico','Carga e vazio sem repouso'],['S7','Contínuo com partida e frenagem','Sem repouso desenergizado'],['S8','Mudanças de velocidade/carga','Regimes definidos'],['S9','Carga não periódica','Variação não periódica'],['S10','Cargas distintas','Número limitado de níveis de carga']],
  si_units:[['Força','newton (N)','kg·m/s²'],['Pressão','pascal (Pa)','N/m²'],['Energia','joule (J)','N·m'],['Potência','watt (W)','J/s'],['Carga elétrica','coulomb (C)','A·s'],['Tensão','volt (V)','W/A'],['Resistência','ohm (Ω)','V/A'],['Capacitância','farad (F)','C/V'],['Indutância','henry (H)','Wb/A'],['Fluxo magnético','weber (Wb)','V·s'],['Densidade de fluxo','tesla (T)','Wb/m²']],
  iec60320:[['C1/C2','Baixa temperatura','Conferir corrente e temperatura'],['C5/C6','Tipo trevo','Usado em alguns adaptadores'],['C7/C8','Figura 8','Aparelhos de baixa potência'],['C13/C14','Conector de computador','Conferir corrente nominal'],['C15/C16','Alta temperatura','Verificar temperatura nominal'],['C19/C20','Alta corrente','Equipamentos de maior potência']],
  ansi_devices:[['25','Sincronismo','Verifica condições de sincronização'],['27','Subtensão','Tensão abaixo do ajuste'],['32','Potência direcional','Direção de potência'],['46','Sequência negativa','Desequilíbrio de corrente'],['49','Proteção térmica','Aquecimento de máquina'],['50','Sobrecorrente instantânea','Sem atraso intencional'],['51','Sobrecorrente temporizada','Característica de tempo'],['52','Disjuntor CA','Manobra/proteção'],['59','Sobretensão','Tensão acima do ajuste'],['67','Sobrecorrente direcional','Direção e corrente'],['79','Religamento CA','Religamento automático'],['81','Frequência','Sub/sobrefrequência'],['86','Relé de bloqueio','Bloqueio após atuação'],['87','Proteção diferencial','Compara correntes']],
  thermocouple_colors:[['K','NiCr-NiAl','IEC: geralmente verde; ANSI: amarelo'],['J','Fe-CuNi','IEC: geralmente preto; ANSI: branco'],['T','Cu-CuNi','IEC: geralmente marrom; ANSI: azul'],['E','NiCr-CuNi','IEC: geralmente violeta; ANSI: roxo'],['N','NiCrSi-NiSi','IEC: geralmente rosa; ANSI: laranja'],['R/S','PtRh-Pt','IEC: geralmente laranja; ANSI: preto']],
  country_voltage:[['Brasil','127/220 V','60 Hz'],['Estados Unidos','120/240 V','60 Hz'],['Canadá','120/240 V','60 Hz'],['Reino Unido','230 V','50 Hz'],['União Europeia','230 V','50 Hz'],['Austrália','230 V','50 Hz'],['Nova Zelândia','230 V','50 Hz'],['Índia','230 V','50 Hz'],['Japão','100 V','50/60 Hz conforme região'],['México','127/220 V','60 Hz']],
  breaker_classes:[['B','3–5 × In','Cargas resistivas e baixa corrente de partida'],['C','5–10 × In','Uso geral; validar partida'],['D','10–20 × In','Altas correntes de partida']],
  mccb_classes:[['MCCB','Caixa moldada','Corrente e ajustes dependem do modelo'],['Icu','Capacidade última de interrupção','Deve atender ao curto presumido'],['Ics','Capacidade em serviço','Conferir fabricante'],['Ir','Ajuste de sobrecarga','Coordenar com condutor'],['Im','Ajuste magnético','Coordenar com curto e partida']],
  rccb_rcbo:[['RCCB / IDR','Proteção diferencial residual','Não protege sozinho contra sobrecarga/curto'],['RCBO','Diferencial + sobrecorrente','Protege contra fuga e sobrecorrente'],['Tipo AC','Corrente residual AC senoidal','Pode ser inadequado para cargas eletrônicas'],['Tipo A','AC e residual pulsante CC','Verificar aplicação'],['IΔn','Sensibilidade diferencial nominal','Selecionar conforme norma']],
  fuse_class_ul_csa:[['Class CC','Compacto, limitador de corrente','Conferir tensão, corrente e SCCR'],['Class J','Limitador de corrente','Base específica'],['Class RK1/RK5','Uso industrial','Características de limitação variam'],['Class T','Alta capacidade de interrupção','Compatibilidade do porta-fusível'],['Class G','Aplicações específicas','Conferir especificação'],['Class L','Altas correntes','Aplicação industrial']],
  fuse_application:[['gG / gL','Proteção geral de cabos','Coordenar corrente e interrupção'],['aM','Curto-circuito em motores','Exige proteção de sobrecarga separada'],['gPV','Circuitos fotovoltaicos','Conferir tensão CC e corrente de falta'],['gR / aR','Semicondutores','Coordenar I²t']],
  junction_box:[['4×2','Aprox. 100 × 50 mm','Dimensão varia por fabricante'],['4×4','Aprox. 100 × 100 mm','Confirmar profundidade'],['Octogonal','Diâmetro varia por modelo','Usada em pontos de iluminação']],
  switch_box:[['4×2','Aprox. 100 × 50 mm','Capacidade depende da profundidade'],['4×4','Aprox. 100 × 100 mm','Mais espaço para conexões'],['Profunda','Profundidade ampliada','Verificar volume de condutores']],
  metal_conduit:[['16 mm','3/8 in aprox.','Verificar série e diâmetro interno'],['20 mm','1/2 in aprox.','Verificar série e diâmetro interno'],['25 mm','3/4 in aprox.','Verificar série e diâmetro interno'],['32 mm','1 in aprox.','Verificar série e diâmetro interno'],['40 mm','1 1/4 in aprox.','Verificar série e diâmetro interno'],['50 mm','1 1/2 in aprox.','Verificar série e diâmetro interno']],
  pvc_conduit:[['20 mm','DN 20','Diâmetro interno depende da classe'],['25 mm','DN 25','Diâmetro interno depende da classe'],['32 mm','DN 32','Diâmetro interno depende da classe'],['40 mm','DN 40','Diâmetro interno depende da classe'],['50 mm','DN 50','Diâmetro interno depende da classe'],['60 mm','DN 60','Diâmetro interno depende da classe']],
  mounting_height:[['Interruptor','~1,10–1,20 m','Referência comum; confirmar projeto'],['Tomada baixa','~0,30 m','Referência comum; depende do ambiente'],['Tomada de bancada','~1,00–1,30 m','Ajustar à bancada'],['Quadro de distribuição','Conforme projeto e acesso seguro','Respeitar norma e acessibilidade'],['Luminária','Conforme projeto luminotécnico','Depende do pé-direito e uso']],
  installation_distances:[['Separação elétrica/dados','Conforme norma e blindagem','Não existe distância universal'],['Afastamento de água/gás','Conforme regulamentação local','Evitar interferências e permitir manutenção'],['Altura de tomada/interruptor','Conforme projeto e acessibilidade','Referência não é prescrição universal']],
  breaker_selection:[['Corrente de projeto Ib','Calcular a partir da carga','In ≥ Ib'],['Corrente nominal In','Dispositivo de proteção','In ≤ Iz'],['Capacidade Iz','Após fatores de correção','Iz ≥ In'],['Icn/Icu','Capacidade de interrupção','≥ curto presumido'],['Curva/ajuste','Compatível com partida e carga','Verificar seletividade']],
};
const materialRho: Record<string,number> = {cobre:0.01724,alumínio:0.0282,prata:0.0159,ouro:0.0244,ferro:0.0971,tungstênio:0.056,latão:0.065};
const TableView: React.FC<{rows:Row[];query:string}> = ({rows,query}) => <div className="overflow-x-auto rounded-xl border border-[#2A3A55]"><table className="w-full min-w-[430px] text-left text-xs"><thead className="bg-black/20 text-[#9FB0C8]"><tr>{['Item','Referência','Observação'].map(x=><th key={x} className="p-3 font-medium">{x}</th>)}</tr></thead><tbody>{rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase())).map((r,i)=><tr key={i} className="border-t border-[#2A3A55] text-[#E8EDF5]">{r.map((x,j)=><td key={j} className="p-3 align-top">{x}</td>)}</tr>)}</tbody></table></div>;

export const ElectricalReferenceToolsView: React.FC<{toolId:string;title:string}> = ({toolId,title}) => {
  const [raw,setRaw]=useState('12'), [section,setSection]=useState('2.5'), [length,setLength]=useState('20'), [current,setCurrent]=useState('16'), [voltage,setVoltage]=useState('220'), [power,setPower]=useState('1000'), [frequency,setFrequency]=useState('60'), [pf,setPf]=useState('0.9'), [phases,setPhases]=useState('1'), [material,setMaterial]=useState('cobre'), [temp,setTemp]=useState('30'), [count,setCount]=useState('3'), [query,setQuery]=useState('');
  const n=Number(raw), s=Number(section), l=Number(length), i=Number(current), v=Number(voltage), p=Number(power), f=Number(frequency), cos=Number(pf);
  const result=useMemo(()=>{
    if(!Number.isFinite(n)) return null;
    if(toolId==='awg_mm2'||toolId==='awg_conversion'){const a=awgAreas[Math.round(n)];return a?[''+a+' mm²','Diâmetro aproximado: '+fmt(Math.sqrt(4*a/Math.PI))+' mm','AWG discreto; a entrada é arredondada ao número inteiro mais próximo.']:null;}
    if(toolId==='mm2_awg'){const m=Object.entries(awgAreas).sort((a,b)=>Math.abs(a[1]-n)-Math.abs(b[1]-n))[0];return n>0&&m?['AWG '+m[0],m[1]+' mm²','Bitola AWG mais próxima por área; não substitui a seleção métrica normalizada.']:null;}
    if(toolId==='kcmil_mm2')return n>=0?[fmt(n*0.506707479)+' mm²','1 kcmil = 0,506707479 mm²','Conversão geométrica.']:null;
    if(toolId==='circular_mil_mm2')return n>=0?[fmt(n*0.000506707479)+' mm²','1 circular mil = 0,000506707479 mm²','Conversão geométrica.']:null;
    if(toolId==='copper_resistance'||toolId==='aluminum_resistance'){const rho=toolId==='copper_resistance'?0.01724:0.0282;return n>0&&s>0? [fmt(rho*n/s)+' Ω','R = ρL/S; comprimento '+n+' m, seção '+s+' mm²','Condutor ideal a 20 °C, sem conexões nem efeito pelicular.']:null;}
    if(toolId==='voltage_drop'){const rho=material==='alumínio'?0.0282:0.01724;const drop=2*rho*n*i/s;return n>0&&i>=0&&s>0&&v>0?[fmt(drop)+' V ('+fmt(drop/v*100)+'%)','ΔV ≈ 2 × ρ × L × I / S','Estimativa resistiva monofásica; trifásico, reatância e temperatura alteram o resultado.']:null;}
    if(toolId==='cable_reactance'){const x=2*Math.PI*f*0.00000008*n;return f>0&&n>=0?[fmt(x)+' Ω','X ≈ 2πfL; indutância presumida 0,08 mH/km','A reatância real depende da geometria e disposição dos condutores.']:null;}
    if(toolId==='resistivity'){const rho=materialRho[material]??materialRho.cobre;const r=rho*n/s;return n>=0&&s>0?[fmt(r)+' Ω','R = ρL/S; '+material+', seção '+s+' mm²','Resistividade aproximada a 20 °C; ligas e temperatura alteram o valor.']:null;}
    if(toolId==='short_circuit')return n>0&&v>0?[fmt(v/n)+' A','Icc ≈ V/Z','Só use se a impedância total do circuito de falta for conhecida.']:null;
    if(toolId==='conduit_fill'){const d=n, area=Math.PI*d*d/4, occupied=Number(count)*s;return d>0&&Number(count)>0&&s>0?[fmt(occupied)+' mm² ocupados','Área circular interna '+fmt(area)+' mm²; ocupação '+fmt(occupied/area*100)+'%','Informe diâmetro interno, quantidade e área de cada condutor. Limite admissível depende da norma.']:null;}
    if(toolId==='distribution_board'){const circuits=Math.max(0,Math.floor(n));return [Math.ceil(circuits*1.25)+' módulos DIN estimados',circuits+' circuitos com reserva indicativa de 25%','Contabilize largura real de dispositivos, DPS, DR, barramentos e reserva de projeto.'];}
    if(toolId==='cable_tray')return n>0&&s>0?[fmt(n/(s*0.4))+' mm de largura estimada','Ocupação alvo de 40%','Estimativa geométrica; não verifica carga mecânica, dissipação ou segregação.']:null;
    if(toolId==='capacitor_colors'){const digits=String(Math.floor(n));if(!/^\d{3}$/.test(digits))return null;const pf=Number(digits.slice(0,2))*Math.pow(10,Number(digits[2]));return [fmt(pf)+' pF',fmt(pf/1000)+' nF / '+fmt(pf/1000000)+' µF','Código de 3 dígitos interpretado como dois algarismos significativos e multiplicador em pF; confirme a convenção do fabricante.'];}
    if(toolId==='resistor_standard'){const series=[1,1.2,1.5,1.8,2.2,2.7,3.3,3.9,4.7,5.6,6.8,8.2];if(n<=0)return null;const decade=Math.pow(10,Math.floor(Math.log10(n)));const vals=series.concat(series.map(x=>x/10),series.map(x=>x*10)).map(x=>x*decade);const closest=vals.sort((a,b)=>Math.abs(a-n)-Math.abs(b-n))[0];return [fmt(closest)+' Ω','Valor informado: '+fmt(n)+' Ω','Aproximação à série E12; E24/E96 oferecem mais valores.'];}
    if(toolId==='motor_flc'||toolId==='transformer_current'||toolId==='transformer_kva'){const factor=phases==='3'?Math.sqrt(3):1;const amps=toolId==='motor_flc'?p/(factor*v*Math.max(0.01,cos)):p/(factor*v);return p>0&&v>0?[toolId==='transformer_kva'?fmt(p/1000)+' kVA':fmt(amps)+' A',toolId==='motor_flc'?'I ≈ P/(√3 × V × FP), sem rendimento':toolId==='transformer_kva'?'S = VA / 1000':'I = VA / (√3 × V)','Informe potência em W para motor ou VA para transformador; confira se o valor corresponde à placa e ao sistema.']:null;}
    return null;
  },[toolId,raw,section,length,current,voltage,power,frequency,pf,phases,material,count,n,s,l,i,v,p,f,cos]);
  const tableRows=useMemo<Row[]>(()=>{
    if(tables[toolId])return tables[toolId];
    if(['cable_size','wire_gauge','awg_conversion'].includes(toolId))return [1.5,2.5,4,6,10,16,25,35,50,70,95,120].map(mm=>{const entry=Object.entries(awgAreas).sort((a,b)=>Math.abs(a[1]-mm)-Math.abs(b[1]-mm))[0];return [mm+' mm²','AWG '+entry[0]+'; Ø '+fmt(Math.sqrt(4*mm/Math.PI))+' mm','Cobre '+fmt(0.01724/mm*1000)+' Ω/km; alumínio '+fmt(0.0282/mm*1000)+' Ω/km'] as Row;});
    if(toolId==='ampacity_table')return [['1,5 mm²','15–18 A','Faixa ilustrativa; método e instalação alteram ampacidade'],['2,5 mm²','20–24 A','Verificar tabela normativa'],['4 mm²','28–32 A','Referência ilustrativa'],['6 mm²','36–41 A','Referência ilustrativa'],['10 mm²','50–57 A','Referência ilustrativa'],['16 mm²','68–76 A','Referência ilustrativa'],['25 mm²','89–101 A','Referência ilustrativa'],['35 mm²','110–125 A','Referência ilustrativa']];
    if(toolId==='derating')return [['Temperatura ambiente','Fator indicativo PVC 70 °C','Observação'],['30 °C','1,00','Referência ilustrativa'],['35 °C','0,94','Conferir tabela normativa'],['40 °C','0,87','Conferir tabela normativa'],['45 °C','0,79','Conferir tabela normativa'],['50 °C','0,71','Conferir tabela normativa'],['Agrupamento','Fator indicativo','Depende do arranjo'],['2 circuitos','0,80','Exemplo simplificado'],['3 circuitos','0,70','Exemplo simplificado']];
    if(toolId==='copper_resistance'||toolId==='aluminum_resistance')return [1.5,2.5,4,6,10,16,25,35,50,70,95,120].map(mm=>[mm+' mm²',fmt((toolId==='copper_resistance'?0.01724:0.0282)/mm*1000)+' Ω/km','Valor ideal aproximado a 20 °C'] as Row);
    if(toolId==='busbar')return [['10 × 3 mm','30 mm²','Corrente não pode ser inferida apenas pela seção'],['15 × 3 mm','45 mm²','Verificar elevação térmica e ventilação'],['20 × 5 mm','100 mm²','Verificar suportes e curto-circuito'],['30 × 5 mm','150 mm²','Consultar fabricante e projeto']];
    if(toolId==='cable_gland')return [['M12','Faixa de cabo varia por fabricante','Conferir diâmetro externo e grau IP'],['M16','Faixa de cabo varia por fabricante','Conferir rosca e vedação'],['M20','Faixa de cabo varia por fabricante','Conferir rosca e vedação'],['M25','Faixa de cabo varia por fabricante','Conferir rosca e vedação'],['M32','Faixa de cabo varia por fabricante','Conferir rosca e vedação']];
    if(toolId==='ground_rod')return [['1/2 in','Diâmetro comercial encontrado','Comprimento, revestimento e solo dependem do projeto'],['5/8 in','Diâmetro comercial encontrado','Confirmar material e norma local'],['3/4 in','Diâmetro comercial encontrado','Confirmar compatibilidade de conectores']];
    if(toolId==='cable_tray')return [['50 mm','Largura nominal','Selecionar pela quantidade, segregação e carga'],['100 mm','Largura nominal','Verificar suporte e preenchimento'],['150 mm','Largura nominal','Verificar suporte e preenchimento'],['200 mm','Largura nominal','Verificar suporte e preenchimento'],['300 mm','Largura nominal','Verificar suporte e preenchimento']];
    if(toolId==='capacitor_colors')return [['Código de 3 dígitos','Dois primeiros dígitos + multiplicador em pF','Confirmar convenção do fabricante'],['Tolerância','Letra ou marcação impressa','Não inferir se o código não for conhecido'],['Polaridade','Marcação do fabricante','Capacitores polarizados exigem orientação correta']];
    if(toolId==='fuse_application'||toolId==='fuse_classification')return [['gG / gL','Proteção geral de cabos','Coordenar corrente e capacidade de interrupção'],['aM','Curto-circuito para motores','Exige proteção de sobrecarga separada'],['gPV','Circuitos fotovoltaicos','Conferir tensão CC e corrente de falta'],['gR / aR','Semicondutores','Coordenar I²t']];
    if(toolId==='fuse_class_ul_csa')return [['Class CC','Compacto, limitador de corrente','Conferir tensão, corrente e SCCR'],['Class J','Limitador de corrente','Base específica'],['Class RK1/RK5','Uso industrial','Características variam'],['Class T','Alta capacidade de interrupção','Compatibilidade do porta-fusível'],['Class G','Aplicações específicas','Conferir especificação'],['Class L','Altas correntes','Aplicação industrial']];
    if(toolId==='metal_conduit'||toolId==='pvc_conduit')return ['16','20','25','32','40','50','60'].map(mm=>[mm+' mm','Diâmetro nominal','Diâmetro interno depende da classe e fabricante'] as Row);
    if(toolId==='junction_box'||toolId==='switch_box')return [['4×2','Aprox. 100 × 50 mm','Dimensões variam por profundidade e fabricante'],['4×4','Aprox. 100 × 100 mm','Confirmar volume e quantidade de condutores'],['Octogonal','Varia por modelo','Usada frequentemente em pontos de iluminação']];
    if(toolId==='mounting_height')return [['Interruptor','~1,10–1,20 m','Referência comum; confirmar projeto'],['Tomada baixa','~0,30 m','Depende do ambiente'],['Tomada de bancada','~1,00–1,30 m','Ajustar à bancada'],['Quadro','Conforme projeto','Garantir acesso e segurança'],['Luminária','Projeto luminotécnico','Depende de pé-direito e uso']];
    if(toolId==='installation_distances')return [['Elétrica/dados','Conforme norma e blindagem','Não existe distância universal'],['Água/gás','Conforme regulamentação local','Evitar interferência e permitir manutenção'],['Tomadas/interruptores','Projeto e acessibilidade','Referência não é prescrição universal']];
    if(toolId==='distribution_board')return [['Circuitos','Módulos DIN','Reserva de espaço'],['4','5 ou mais','Não inclui todos os acessórios'],['8','10 ou mais','Verificar largura real dos dispositivos'],['12','15 ou mais','Prever DR, DPS e reserva']];
    return [];
  },[toolId]);
  const showInput=['awg_mm2','mm2_awg','kcmil_mm2','circular_mil_mm2','awg_conversion','copper_resistance','aluminum_resistance','voltage_drop','cable_reactance','resistivity','capacitor_colors','short_circuit','conduit_fill','distribution_board','cable_tray','resistor_standard','motor_flc','transformer_current','transformer_kva'].includes(toolId);
  return <div className="space-y-4">
    <section className={panel}><div className="flex items-start gap-3"><div className="rounded-xl bg-[#1F66D6]/20 p-3"><Calculator className="h-5 w-5 text-[#5B9BFF]"/></div><div><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-xs text-[#9FB0C8]">{ELECTRICAL_REFERENCE_TOOLS.find(t=>t.id===toolId)?.subtitle}</p></div></div></section>
    {showInput&&<section className={panel}><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {!['motor_flc','transformer_current','transformer_kva'].includes(toolId)&&<label><span className={label}>{toolId==='awg_mm2'||toolId==='awg_conversion'?'Bitola AWG':toolId==='mm2_awg'?'Seção (mm²)':toolId==='kcmil_mm2'?'kcmil':toolId==='circular_mil_mm2'?'Circular mil':toolId==='distribution_board'?'Número de circuitos':toolId==='capacitor_colors'?'Código de 3 dígitos':toolId==='motor_flc'?'Potência do motor (W)':toolId==='transformer_current'||toolId==='transformer_kva'?'Potência aparente do transformador (VA)':toolId==='short_circuit'?'Impedância total (Ω)':toolId==='conduit_fill'?'Diâmetro interno (mm)':toolId==='cable_tray'?'Área projetada dos cabos (mm²)':toolId==='resistor_standard'?'Resistência desejada (Ω)':'Comprimento do condutor (m)'}</span><input className={field} type="number" value={raw} onChange={e=>setRaw(e.target.value)}/></label>}
      {['copper_resistance','aluminum_resistance','voltage_drop','resistivity'].includes(toolId)&&<label><span className={label}>Seção (mm²)</span><select className={field} value={section} onChange={e=>setSection(e.target.value)}>{['0.5','0.75','1','1.5','2.5','4','6','10','16','25','35','50','70','95','120'].map(x=><option key={x} value={x}>{x.replace('.',',')} mm²</option>)}</select></label>}
      {['voltage_drop','short_circuit','motor_flc','transformer_current','transformer_kva'].includes(toolId)&&<label><span className={label}>Tensão (V)</span><input className={field} type="number" value={voltage} onChange={e=>setVoltage(e.target.value)}/></label>}
      {toolId==='voltage_drop'&&<label><span className={label}>Corrente (A)</span><input className={field} type="number" value={current} onChange={e=>setCurrent(e.target.value)}/></label>}
      {toolId==='cable_reactance'&&<><label><span className={label}>Frequência (Hz)</span><input className={field} type="number" value={frequency} onChange={e=>setFrequency(e.target.value)}/></label></>}
      {toolId==='resistivity'&&<label><span className={label}>Material</span><select className={field} value={material} onChange={e=>setMaterial(e.target.value)}>{Object.keys(materialRho).map(x=><option key={x}>{x}</option>)}</select></label>}
      {toolId==='conduit_fill'&&<><label><span className={label}>Quantidade de condutores</span><input className={field} type="number" value={count} onChange={e=>setCount(e.target.value)}/></label><label><span className={label}>Área de cada condutor (mm²)</span><input className={field} type="number" value={section} onChange={e=>setSection(e.target.value)}/></label></>}
      {toolId==='cable_tray'&&<label><span className={label}>Altura útil do leito (mm)</span><input className={field} type="number" value={section} onChange={e=>setSection(e.target.value)}/></label>}
      {['motor_flc','transformer_current','transformer_kva'].includes(toolId)&&<><label><span className={label}>Potência (W ou VA)</span><input className={field} type="number" value={power} onChange={e=>setPower(e.target.value)}/></label><label><span className={label}>Sistema</span><select className={field} value={phases} onChange={e=>setPhases(e.target.value)}><option value="1">Monofásico</option><option value="3">Trifásico</option></select></label><label><span className={label}>Fator de potência (motor)</span><input className={field} type="number" min="0.01" max="1" step="0.01" value={pf} onChange={e=>setPf(e.target.value)}/></label></>}
    </div>{result&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Metric label="Resultado" value={result[0]}/><Metric label="Fórmula / detalhe" value={result[1]} hint={result[2]}/></div>}</section>}
    {tableRows.length>0&&<section className={panel}><div className="flex items-center gap-2"><Search className="h-4 w-4 text-[#9FB0C8]"/><input className={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar tabela..."/></div><TableView rows={tableRows} query={query}/></section>}
    {['wire_colors_standard','iec_colors','nec_colors','uk_colors','europe_colors','india_colors','pakistan_colors','au_nz_colors','single_phase_colors','three_phase_colors','dc_colors','live_colors','neutral_colors','earth_colors','old_new_colors','international_colors','color_guide','color_safety','color_errors'].includes(toolId)&&<LimitBar message="Nunca identifique condutores apenas pela cor. Instalações antigas ou alteradas podem divergir. Desenergize, bloqueie, verifique ausência de tensão e rastreie os condutores com instrumentos adequados; siga NR-10 e a norma local."/>}
    {['ampacity_table','derating','voltage_drop','fuse_application','fuse_classification','fuse_class_ul_csa','breaker_classes','mccb_classes','rccb_rcbo','breaker_selection','short_circuit','motor_flc','transformer_current','transformer_kva','busbar'].includes(toolId)&&<LimitBar message="Referência educativa/estimativa preliminar, não projeto certificado. Considere norma vigente, placa do equipamento, curto-circuito presumido, condições de instalação e documentação do fabricante."/>}
    {toolId==='country_voltage'&&<p className="text-xs text-[#9FB0C8]">Tensões nominais podem variar por região e concessionária. Confirme a alimentação antes de conectar equipamentos.</p>}
    {toolId==='conduit_fill'&&<p className="text-xs text-[#9FB0C8]">A ferramenta calcula área geométrica simples; não substitui regras normativas de ocupação, puxamento, aquecimento e raio de curvatura.</p>}
    {!tableRows.length&&!showInput&&<section className={panel}><h4 className="font-semibold text-white">Orientação de uso</h4><p className="text-sm text-[#D5DEEA]">{ELECTRICAL_REFERENCE_TOOLS.find(t=>t.id===toolId)?.subtitle}</p><p className="text-xs text-[#9FB0C8]">Confirme edição normativa, dados do fabricante e condições reais antes de usar a referência em uma instalação.</p></section>}
    <section className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-3 flex gap-2"><Info className="h-4 w-4 shrink-0 text-blue-300 mt-0.5"/><p className="text-xs leading-relaxed text-[#B8C9E2]">Tabelas indicativas podem variar por fabricante, jurisdição, método de instalação e edição normativa. O resultado não comprova conformidade elétrica nem substitui avaliação de profissional habilitado.</p></section>
  </div>;
};
