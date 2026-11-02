import React from 'react';
import { LimitBar } from '../components/LimitBar';

type FormulaCard = {
  title: string;
  formula: string;
  explanation: string;
};

type FormulaGroup = {
  title: string;
  subtitle: string;
  symbol: string;
  cards: FormulaCard[];
};

const groups: FormulaGroup[] = [
  {
    title: 'Geometria para instalações elétricas',
    subtitle: 'Fórmulas de geometria e área de condutores',
    symbol: '📐',
    cards: [
      { title: 'Área do círculo', formula: 'A = πr²', explanation: 'A = área (m²); r = raio (m).' },
      { title: 'Área do círculo pelo diâmetro', formula: 'A = πd² ÷ 4', explanation: 'd = diâmetro (m).' },
      { title: 'Diâmetro do círculo', formula: 'd = 2r', explanation: 'r = raio (m).' },
      { title: 'Densidade de corrente do cabo', formula: 'J = I ÷ A', explanation: 'J = densidade de corrente (A/mm²); I = corrente (A); A = seção do condutor (mm²).' },
    ],
  },
  {
    title: 'Regras elétricas rápidas',
    subtitle: 'Relações fundamentais de tensão, potência e energia',
    symbol: '🧮',
    cards: [
      { title: 'Tensão pela Lei de Ohm', formula: 'V = I × R', explanation: 'V = tensão (V); I = corrente (A); R = resistência (Ω).' },
      { title: 'Corrente pela Lei de Ohm', formula: 'I = V ÷ R', explanation: 'I = corrente (A); V = tensão (V); R = resistência (Ω).' },
      { title: 'Resistência pela Lei de Ohm', formula: 'R = V ÷ I', explanation: 'R = resistência (Ω); V = tensão (V); I = corrente (A).' },
      { title: 'Condutância', formula: 'G = 1 ÷ R', explanation: 'G = condutância (S); R = resistência (Ω), diferente de zero.' },
      { title: 'Potência em corrente contínua', formula: 'P = V × I', explanation: 'P = potência (W); V = tensão (V); I = corrente (A). Em CA, use a expressão de potência ativa adequada.' },
      { title: 'Potência pela corrente e resistência', formula: 'P = I² × R', explanation: 'P = potência dissipada (W); I = corrente eficaz/CC (A); R = resistência (Ω).' },
      { title: 'Potência pela tensão e resistência', formula: 'P = V² ÷ R', explanation: 'P = potência (W); V = tensão CC ou eficaz sobre R (V); R = resistência (Ω).' },
      { title: 'Corrente a partir da potência', formula: 'I = P ÷ V', explanation: 'Para CC ou carga resistiva; em CA geral, considere fator de potência e tipo de sistema.' },
      { title: 'Tensão a partir da potência', formula: 'V = P ÷ I', explanation: 'Para CC ou carga resistiva; P = potência (W); I = corrente (A).' },
      { title: 'Triângulo de energia', formula: 'E = P × t', explanation: 'E = energia (Wh, se P estiver em W); P = potência; t = tempo (h).' },
      { title: 'Potência aparente', formula: 'S² = P² + Q²', explanation: 'S = potência aparente (VA); P = potência ativa (W); Q = potência reativa (var).' },
      { title: 'Potência reativa', formula: 'Q = √(S² − P²)', explanation: 'Calcula Q a partir das potências aparente e ativa, em regime senoidal.' },
      { title: 'Potência ativa', formula: 'P = √(S² − Q²)', explanation: 'Calcula P a partir das potências aparente e reativa, em regime senoidal.' },
    ],
  },
  {
    title: 'Conversões de unidades elétricas',
    subtitle: 'Conversões usuais de corrente, tensão, potência e grandezas',
    symbol: '🔢',
    cards: [
      { title: 'Miliampères para ampères', formula: 'A = mA ÷ 1.000', explanation: '1.000 mA = 1 A.' },
      { title: 'Ampères para miliampères', formula: 'mA = A × 1.000', explanation: '1 A = 1.000 mA.' },
      { title: 'Milivolts para volts', formula: 'V = mV ÷ 1.000', explanation: '1.000 mV = 1 V.' },
      { title: 'Quilovolts para volts', formula: 'V = kV × 1.000', explanation: '1 kV = 1.000 V.' },
      { title: 'Watts para quilowatts', formula: 'kW = W ÷ 1.000', explanation: '1 kW = 1.000 W.' },
      { title: 'Quilowatts para watts', formula: 'W = kW × 1.000', explanation: '1 kW = 1.000 W.' },
      { title: 'Watts para megawatts', formula: 'MW = W ÷ 1.000.000', explanation: '1 MW = 1.000.000 W.' },
      { title: 'Megawatts para watts', formula: 'W = MW × 1.000.000', explanation: '1 MW = 1.000.000 W.' },
      { title: 'Watts para horsepower (HP)', formula: 'HP ≈ W ÷ 746', explanation: 'Conversão aproximada; 1 HP mecânico ≈ 745,7 W.' },
      { title: 'Horsepower para watts', formula: 'W ≈ HP × 746', explanation: 'Conversão aproximada; confirme se a especificação usa HP ou CV.' },
      { title: 'Ohms para quilo-ohms', formula: 'kΩ = Ω ÷ 1.000', explanation: '1.000 Ω = 1 kΩ.' },
      { title: 'Quilo-ohms para ohms', formula: 'Ω = kΩ × 1.000', explanation: '1 kΩ = 1.000 Ω.' },
      { title: 'Farads para microfarads', formula: 'µF = F × 1.000.000', explanation: '1 F = 1.000.000 µF.' },
      { title: 'Microfarads para farads', formula: 'F = µF ÷ 1.000.000', explanation: '1 µF = 0,000001 F.' },
      { title: 'Henrys para milihenrys', formula: 'mH = H × 1.000', explanation: '1 H = 1.000 mH.' },
    ],
  },
  {
    title: 'Proteção e dimensionamento',
    subtitle: 'Princípios iniciais para corrente de carga, proteção e cabos',
    symbol: '🛡️',
    cards: [
      { title: 'Corrente aproximada da carga', formula: 'I = P ÷ V', explanation: 'Aproximação para fator de potência unitário e sistema monofásico resistivo.' },
      { title: 'Princípio de seleção da proteção', formula: 'In ≥ Ib', explanation: 'A corrente nominal do dispositivo deve atender à corrente de projeto; a seleção também depende da capacidade do cabo e da coordenação.' },
      { title: 'Princípio de capacidade do cabo', formula: 'Ib ≤ In ≤ Iz', explanation: 'Ib = corrente de projeto; In = corrente nominal da proteção; Iz = capacidade de condução corrigida do cabo.' },
    ],
  },
  {
    title: 'Eficiência',
    subtitle: 'Rendimento elétrico e mecânico',
    symbol: '🔄',
    cards: [
      { title: 'Eficiência percentual', formula: 'η = (Saída ÷ Entrada) × 100', explanation: 'Entrada e saída devem estar na mesma grandeza e unidade; η é apresentado em porcentagem.' },
      { title: 'Potência de saída', formula: 'Saída = Entrada × η', explanation: 'η deve ser usado como decimal, por exemplo 0,90 para 90%.' },
      { title: 'Potência de entrada', formula: 'Entrada = Saída ÷ η', explanation: 'η deve ser usado como decimal entre 0 e 1.' },
    ],
  },
  {
    title: 'Correção do fator de potência',
    subtitle: 'Relações de potência reativa e dimensionamento teórico de capacitância',
    symbol: '📊',
    cards: [
      { title: 'Potência reativa', formula: 'Q = P × tan(φ)', explanation: 'P = potência ativa (W); φ = ângulo de defasagem; Q = potência reativa (var).' },
      { title: 'Ângulo do fator de potência', formula: 'φ = cos⁻¹(FP)', explanation: 'FP = fator de potência, entre 0 e 1; o ângulo é expresso em radianos ou graus conforme a calculadora.' },
      { title: 'Potência reativa do capacitor', formula: 'Qc = 2πfCV²', explanation: 'Modelo monofásico ideal; f = frequência (Hz); C = capacitância (F); V = tensão eficaz (V).' },
      { title: 'Capacitância para correção', formula: 'C = Qc ÷ (2πfV²)', explanation: 'Modelo monofásico ideal. Em bancos trifásicos, a ligação estrela/triângulo altera a relação por fase.' },
    ],
  },
  {
    title: 'Queda de tensão',
    subtitle: 'Relações resistivas básicas para circuitos e condutores',
    symbol: '📏',
    cards: [
      { title: 'Queda de tensão em corrente contínua', formula: 'Vdrop = I × R', explanation: 'I = corrente (A); R = resistência total do trecho (Ω).' },
      { title: 'Resistência do cabo', formula: 'R = ρL ÷ A', explanation: 'ρ = resistividade (Ω·m); L = comprimento (m); A = seção transversal (m²).' },
      { title: 'Resistividade do material', formula: 'ρ = R × A ÷ L', explanation: 'ρ = resistividade (Ω·m); R = resistência (Ω); A = seção (m²); L = comprimento (m).' },
      { title: 'Percentual de queda de tensão', formula: 'Vdrop% = (Vdrop ÷ Vs) × 100', explanation: 'Vdrop = queda de tensão (V); Vs = tensão de alimentação (V).' },
      { title: 'Tensão na carga', formula: 'Vload = Vs − Vdrop', explanation: 'Vload = tensão na carga; Vs = tensão de alimentação; Vdrop = queda no circuito.' },
    ],
  },
  {
    title: 'Temperatura e resistência',
    subtitle: 'Variação da resistência elétrica com a temperatura',
    symbol: '🌡️',
    cards: [
      { title: 'Resistência em outra temperatura', formula: 'R₂ = R₁[1 + α(T₂ − T₁)]', explanation: 'α = coeficiente de temperatura (°C⁻¹); T₁ e T₂ = temperaturas (°C).' },
      { title: 'Coeficiente de temperatura', formula: 'α = (R₂ − R₁) ÷ [R₁(T₂ − T₁)]', explanation: 'Estimativa do coeficiente para a faixa de temperatura considerada.' },
    ],
  },
  {
    title: 'Condutividade elétrica',
    subtitle: 'Relação entre condutividade e resistividade',
    symbol: '🔌',
    cards: [
      { title: 'Condutividade', formula: 'σ = 1 ÷ ρ', explanation: 'σ = condutividade (S/m); ρ = resistividade (Ω·m).' },
      { title: 'Resistividade', formula: 'ρ = 1 ÷ σ', explanation: 'ρ = resistividade (Ω·m); σ = condutividade (S/m).' },
    ],
  },
  {
    title: 'Instalações elétricas residenciais',
    subtitle: 'Somas de cargas e correntes em circuitos',
    symbol: '🏠',
    cards: [
      { title: 'Corrente da carga', formula: 'I = P ÷ V', explanation: 'Aproximação monofásica para fator de potência unitário; em CA geral, considere FP e rendimento.' },
      { title: 'Potência da carga', formula: 'P = V × I', explanation: 'Relação básica para carga resistiva ou CC; em CA, potência ativa depende do fator de potência.' },
      { title: 'Soma de potências', formula: 'Ptotal = P₁ + P₂ + P₃ + …', explanation: 'Some as potências ativas das cargas consideradas no mesmo conjunto.' },
      { title: 'Soma de correntes', formula: 'Itotal = I₁ + I₂ + I₃ + …', explanation: 'Aplicável a cargas em paralelo alimentadas pela mesma tensão, com correntes consideradas na mesma condição de fase.' },
    ],
  },
  {
    title: 'Capacitores',
    subtitle: 'Capacitância, carga elétrica, energia e associações',
    symbol: '⚡',
    cards: [
      { title: 'Carga do capacitor', formula: 'Q = C × V', explanation: 'Q = carga (C); C = capacitância (F); V = tensão (V).' },
      { title: 'Energia armazenada', formula: 'E = ½CV²', explanation: 'E = energia (J); C = capacitância (F); V = tensão (V).' },
      { title: 'Capacitores em paralelo', formula: 'Ctotal = C₁ + C₂ + C₃ + …', explanation: 'Em paralelo, as capacitâncias se somam.' },
      { title: 'Capacitores em série', formula: '1/Ctotal = 1/C₁ + 1/C₂ + …', explanation: 'Em série, somam-se os inversos das capacitâncias.' },
      { title: 'Capacitores iguais em série', formula: 'Ctotal = C ÷ n', explanation: 'C = capacitância individual; n = número de capacitores idênticos em série.' },
    ],
  },
  {
    title: 'Indutores',
    subtitle: 'Indutância e energia magnética armazenada',
    symbol: '🧲',
    cards: [
      { title: 'Tensão no indutor', formula: 'V = L × (di/dt)', explanation: 'L = indutância (H); di/dt = taxa de variação da corrente (A/s).' },
      { title: 'Energia do indutor', formula: 'E = ½LI²', explanation: 'E = energia (J); L = indutância (H); I = corrente (A).' },
    ],
  },
  {
    title: 'Transformadores',
    subtitle: 'Relações ideais entre tensão, corrente, espiras e rendimento',
    symbol: '⚙️',
    cards: [
      { title: 'Relação de transformação', formula: 'Vp ÷ Vs = Np ÷ Ns', explanation: 'Vp/Vs = relação de tensões; Np/Ns = relação entre espiras do primário e secundário.' },
      { title: 'Tensão secundária', formula: 'Vs = Vp × (Ns ÷ Np)', explanation: 'Relação ideal; desconsidere regulação e perdas.' },
      { title: 'Tensão primária', formula: 'Vp = Vs × (Np ÷ Ns)', explanation: 'Relação ideal; desconsidere regulação e perdas.' },
      { title: 'Relação de correntes', formula: 'Ip ÷ Is = Ns ÷ Np', explanation: 'Transformador ideal; as correntes variam inversamente à relação de espiras.' },
      { title: 'Potência no transformador ideal', formula: 'Pin ≈ Pout', explanation: 'A igualdade é uma aproximação ideal; equipamentos reais apresentam perdas.' },
      { title: 'Eficiência do transformador', formula: 'η = (Pout ÷ Pin) × 100', explanation: 'Pout = potência de saída; Pin = potência de entrada, em unidades iguais.' },
    ],
  },
  {
    title: 'Motores elétricos',
    subtitle: 'Potência, corrente, torque, velocidade e escorregamento',
    symbol: '⚙️',
    cards: [
      { title: 'Potência de entrada trifásica', formula: 'Pin = √3 × V × I × FP', explanation: 'V = tensão entre fases (V); I = corrente de linha (A); FP = fator de potência.' },
      { title: 'Potência de saída', formula: 'Pout = Pin × η', explanation: 'η deve ser usado como decimal; por exemplo, 0,90 para 90%.' },
      { title: 'Eficiência do motor', formula: 'η = (Pout ÷ Pin) × 100', explanation: 'Pout = potência mecânica de saída; Pin = potência elétrica de entrada.' },
      { title: 'Corrente do motor trifásico', formula: 'I = P ÷ (√3 × V × FP × η)', explanation: 'P = potência mecânica de saída (W); V = tensão entre fases; η = rendimento decimal.' },
      { title: 'Corrente do motor monofásico', formula: 'I = P ÷ (V × FP × η)', explanation: 'P = potência mecânica de saída (W); V = tensão; η = rendimento decimal.' },
      { title: 'Torque do motor', formula: 'T = P ÷ ω', explanation: 'T = torque (N·m); P = potência mecânica (W); ω = velocidade angular (rad/s).' },
      { title: 'Velocidade angular', formula: 'ω = 2πN ÷ 60', explanation: 'N = velocidade de rotação (rpm); ω = velocidade angular (rad/s).' },
      { title: 'Velocidade síncrona', formula: 'Ns = 120f ÷ p', explanation: 'Ns = velocidade síncrona (rpm); f = frequência (Hz); p = número de polos.' },
      { title: 'Escorregamento', formula: 'Slip% = [(Ns − Nr) ÷ Ns] × 100', explanation: 'Ns = velocidade síncrona; Nr = velocidade do rotor.' },
    ],
  },
  {
    title: 'Resistores em série e paralelo',
    subtitle: 'Resistência equivalente e relações de corrente e tensão',
    symbol: '🔗',
    cards: [
      { title: 'Resistência em série', formula: 'Rtotal = R₁ + R₂ + R₃ + …', explanation: 'A resistência equivalente é a soma das resistências em série (Ω).' },
      { title: 'Dois resistores em paralelo', formula: 'Rtotal = (R₁ × R₂) ÷ (R₁ + R₂)', explanation: 'Válida para dois resistores ideais em paralelo; R₁ e R₂ em ohms.' },
      { title: 'Vários resistores em paralelo', formula: '1/Rtotal = 1/R₁ + 1/R₂ + …', explanation: 'Some os inversos das resistências; depois calcule o inverso da soma.' },
      { title: 'Resistores iguais em paralelo', formula: 'Rtotal = R ÷ n', explanation: 'R = resistência de cada resistor (Ω); n = quantidade de resistores iguais.' },
      { title: 'Corrente em série', formula: 'I = I₁ = I₂ = I₃', explanation: 'A corrente é a mesma em todos os componentes de um ramo em série.' },
      { title: 'Tensão em paralelo', formula: 'V = V₁ = V₂ = V₃', explanation: 'A tensão é a mesma em todos os ramos ligados em paralelo aos mesmos nós.' },
    ],
  },
  {
    title: 'Fundamentos de corrente alternada',
    subtitle: 'Frequência, período, frequência angular e valores de pico e eficaz',
    symbol: '🔌',
    cards: [
      { title: 'Frequência', formula: 'f = 1 ÷ T', explanation: 'f = frequência (Hz); T = período (s). Relação para sinal periódico.' },
      { title: 'Período', formula: 'T = 1 ÷ f', explanation: 'T = período (s); f = frequência (Hz), diferente de zero.' },
      { title: 'Frequência angular', formula: 'ω = 2πf', explanation: 'ω = frequência angular (rad/s); f = frequência (Hz).' },
      { title: 'Tensão eficaz de onda senoidal', formula: 'Vrms = Vpico ÷ √2', explanation: 'Válida para uma senoide pura; Vrms e Vpico em volts.' },
      { title: 'Tensão de pico senoidal', formula: 'Vpico = Vrms × √2', explanation: 'Válida para uma senoide pura; não se aplica diretamente a formas de onda distorcidas.' },
      { title: 'Corrente eficaz de onda senoidal', formula: 'Irms = Ipico ÷ √2', explanation: 'Válida para uma senoide pura; Irms e Ipico em ampères.' },
      { title: 'Corrente de pico senoidal', formula: 'Ipico = Irms × √2', explanation: 'Válida para uma senoide pura; não se aplica diretamente a formas de onda distorcidas.' },
    ],
  },
  {
    title: 'Reatância em corrente alternada',
    subtitle: 'Reatâncias indutiva e capacitiva em função da frequência',
    symbol: '🌀',
    cards: [
      { title: 'Reatância indutiva', formula: 'XL = 2πfL', explanation: 'XL = reatância (Ω); f = frequência (Hz); L = indutância (H).' },
      { title: 'Reatância capacitiva', formula: 'XC = 1 ÷ (2πfC)', explanation: 'XC = reatância (Ω); f = frequência (Hz); C = capacitância (F).' },
      { title: 'Indutância a partir da reatância', formula: 'L = XL ÷ (2πf)', explanation: 'Isola L na relação de reatância indutiva; f deve ser diferente de zero.' },
      { title: 'Capacitância a partir da reatância', formula: 'C = 1 ÷ (2πfXC)', explanation: 'Isola C na relação de reatância capacitiva; f e XC devem ser diferentes de zero.' },
    ],
  },
  {
    title: 'Impedância em corrente alternada',
    subtitle: 'Módulo da impedância em circuitos RL, RC e RLC série',
    symbol: '〰️',
    cards: [
      { title: 'Impedância de circuito RL série', formula: 'Z = √(R² + XL²)', explanation: 'Módulo da impedância para R e L em série; R e XL em ohms.' },
      { title: 'Impedância de circuito RC série', formula: 'Z = √(R² + XC²)', explanation: 'Módulo da impedância para R e C em série; R e XC em ohms.' },
      { title: 'Impedância de circuito RLC série', formula: 'Z = √[R² + (XL − XC)²]', explanation: 'Módulo da impedância para R, L e C em série; considera a diferença entre reatâncias.' },
      { title: 'Corrente eficaz em CA', formula: 'I = V ÷ Z', explanation: 'V = tensão eficaz (V); Z = módulo da impedância (Ω); I = corrente eficaz (A). Para circuitos senoidais, use valores eficazes.' },
    ],
  },
  {
    title: 'Energia e custo de consumo',
    subtitle: 'Consumo em Wh/kWh, tempo de operação e estimativa de custo',
    symbol: '🔋',
    cards: [
      { title: 'Energia elétrica', formula: 'E = P × t', explanation: 'E em Wh quando P está em W e t em horas; para joules, use potência em W e tempo em segundos.' },
      { title: 'Energia em quilowatt-hora', formula: 'kWh = kW × horas', explanation: 'Energia consumida por uma carga de potência constante durante o período.' },
      { title: 'Energia a partir de watts', formula: 'kWh = (W × horas) ÷ 1000', explanation: 'W = potência em watts; tempo em horas; resultado em kWh.' },
      { title: 'Custo estimado de energia', formula: 'Custo = kWh × tarifa', explanation: 'Tarifa em R$/kWh; o resultado é uma estimativa e pode não incluir impostos, bandeiras, demanda ou taxas.' },
      { title: 'Tempo de operação', formula: 't = E ÷ P', explanation: 't em horas quando E está em Wh e P em W, ou unidades compatíveis; P deve ser maior que zero.' },
    ],
  },
  {
    title: 'LED e resistor limitador',
    subtitle: 'Cálculo inicial do resistor em circuitos CC com LED',
    symbol: '💡',
    cards: [
      { title: 'Resistor em série com LED', formula: 'R = (Vfonte − Vf) ÷ ILED', explanation: 'Vfonte = tensão CC da fonte (V); Vf = tensão direta do LED (V); ILED = corrente desejada (A). Vfonte deve ser maior que Vf.' },
      { title: 'Potência dissipada no resistor', formula: 'Presistor = ILED² × R', explanation: 'Resultado em watts quando ILED está em ampères e R em ohms. Selecione potência nominal com margem térmica adequada.' },
      { title: 'Queda de tensão no resistor', formula: 'VR = Vfonte − Vf', explanation: 'Relação para um LED em série com resistor ideal; considere a tolerância da fonte e a variação de Vf.' },
    ],
  },
  {
    title: 'Baterias',
    subtitle: 'Capacidade, energia nominal, autonomia e associações',
    symbol: '🔋',
    cards: [
      { title: 'Energia da bateria', formula: 'Wh = V × Ah', explanation: 'V = tensão nominal (V); Ah = capacidade nominal (Ah); resultado aproximado em Wh.' },
      { title: 'Corrente média de descarga', formula: 'I = Ah ÷ t', explanation: 'Ah = capacidade considerada; t = tempo (h). Estimativa ideal, sem efeito de Peukert, temperatura ou limite de descarga.' },
      { title: 'Capacidade da bateria', formula: 'Ah = I × t', explanation: 'I = corrente média de descarga (A); t = duração (h); estimativa ideal.' },
      { title: 'Autonomia estimada', formula: 't = Ah ÷ I', explanation: 'Tempo em horas para corrente constante; a capacidade utilizável real depende da química, taxa de descarga, temperatura e profundidade de descarga.' },
      { title: 'Energia da bateria em kWh', formula: 'kWh = (V × Ah) ÷ 1000', explanation: 'Energia nominal aproximada; não representa a energia efetivamente utilizável após perdas e limites de descarga.' },
      { title: 'Baterias em série', formula: 'Vtotal = V₁ + V₂ + …', explanation: 'As tensões se somam; a capacidade em Ah permanece aproximadamente igual quando as baterias são compatíveis.' },
      { title: 'Baterias em paralelo', formula: 'Ahtotal = Ah₁ + Ah₂ + …', explanation: 'As capacidades em Ah se somam; a tensão permanece aproximadamente igual. Use baterias compatíveis e siga as orientações do fabricante.' },
    ],
  },

];

export const ElectricalFormulasView: React.FC = () => (
  <div className="space-y-5 pb-6">
    <header className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">∑</span>
        <div>
          <h3 className="font-bold text-white text-base">Fórmulas Elétricas</h3>
          <p className="text-xs text-[#9FB0C8]">Referência rápida de fórmulas, unidades e relações elétricas.</p>
        </div>
      </div>
    </header>

    {groups.map((group) => (
      <section key={group.title} className="space-y-3">
        <div className="rounded-2xl border border-[#2A3A55] bg-[#1D2A40] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-bold text-white text-base">{group.symbol} {group.title}</h4>
              <p className="mt-1 text-xs text-[#9FB0C8]">{group.subtitle}</p>
            </div>
            <span className="shrink-0 text-[10px] font-bold tracking-wide text-[#5B9BFF]">FÓRMULAS</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {group.cards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-[#2A3A55] bg-[#17243A] p-4 shadow-sm">
              <h5 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span aria-hidden="true" className="text-[#F5B93A]">✦</span>
                {card.title}
              </h5>
              <div className="my-3 rounded-xl bg-[#EAF3FF] px-3 py-4 text-center text-[#24588F]">
                <span className="font-mono text-base sm:text-lg font-semibold break-words">{card.formula}</span>
              </div>
              <p className="text-xs leading-relaxed text-[#B8C9E2]">{card.explanation}</p>
            </article>
          ))}
        </div>
      </section>
    ))}
    <LimitBar message="Fórmulas de referência para estudo e estimativas preliminares. Confira hipóteses, unidades, topologia do circuito, dados do fabricante e normas técnicas aplicáveis antes de dimensionar ou executar uma instalação." />
  </div>
);

