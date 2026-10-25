/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Conteúdo técnico de referência do OBra ENGEP.
 * Resumos autorais com links oficiais; não substituem a íntegra das normas.
 */

import {
  ABNTStandardItem,
  AutomotiveDirtItem,
  LegislationItem,
  ManualItem,
  NRItem,
} from '../types';

export const REFERENCE_NRS: NRItem[] = [
  {
    id: 'nr-35',
    code: 'NR-35',
    title: 'Trabalho em Altura',
    summary:
      'Estabelece requisitos mínimos de proteção para trabalho acima de 2,00 m do nível inferior com risco de queda, incluindo análise de risco, permissão de trabalho, capacitação e sistema de proteção contra quedas.',
    applicability:
      'Toda atividade executada acima de 2,00 m onde haja risco de queda do trabalhador, inclusive acesso por escadas, telhados, andaimes e estruturas.',
    authorizedRoles:
      'Profissionais capacitados e formalmente autorizados, com ASO compatível com a atividade e supervisão conforme análise de risco.',
    epiEpc:
      'Cinto paraquedista com talabarte duplo e absorvedor de energia, capacete com jugular, trava-quedas, ponto de ancoragem dimensionado, linha de vida e proteções coletivas.',
    officialUrl:
      'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-35-nr-35',
    lastVerified: '25/10/2026',
    isOfficial: true,
    checklist: [
      { id: 'c1', label: 'Análise de Risco (AR) formal elaborada e emitida', checked: false },
      { id: 'c2', label: 'Permissão de Trabalho (PT) emitida pelo supervisor', checked: false },
      { id: 'c3', label: 'Ponto de ancoragem certificado e inspecionado antes do uso', checked: false },
      { id: 'c4', label: 'EPIs inspecionados (sem desgaste em costuras e fitas)', checked: false },
      { id: 'c5', label: 'Plano de resgate e primeiros socorros previamente definido', checked: false },
      { id: 'c6', label: 'Condições meteorológicas favoráveis (sem ventania ou chuva)', checked: false },
    ],
  },
  {
    id: 'nr-10',
    code: 'NR-10',
    title: 'Segurança em Instalações e Serviços em Eletricidade',
    summary:
      'Diretrizes para medidas de controle e sistemas preventivos de segurança em instalações elétricas, abrangendo projeto, construção, montagem, operação e manutenção.',
    applicability:
      'Fases de geração, transmissão, distribuição e consumo, incluindo etapas de projeto, construção, montagem e manutenção.',
    authorizedRoles:
      'Eletricistas qualificados, habilitados ou capacitados com treinamento NR-10 (básico 40h e SEP quando aplicável) e autorização formal.',
    epiEpc:
      'Vestimenta 100% algodão ou retardante a arco elétrico (ATPv), luvas de isolamento com sobreluva de couro, calçado sem componentes metálicos expostos, óculos de proteção UV.',
    officialUrl:
      'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-10-nr-10',
    lastVerified: '25/10/2026',
    isOfficial: true,
    checklist: [
      { id: 'c1', label: 'Desenergização comprovada e teste de ausência de tensão efetuado', checked: false },
      { id: 'c2', label: 'Bloqueio mecânico (LOTO) com cadeado e etiqueta de sinalização', checked: false },
      { id: 'c3', label: 'Aterramento temporário com equipotencialização instalado', checked: false },
      { id: 'c4', label: 'Proteção dos elementos energizados existentes na zona controlada', checked: false },
      { id: 'c5', label: 'Delimitação da área de trabalho e sinalização de impedimento', checked: false },
    ],
  },
  {
    id: 'nr-06',
    code: 'NR-06',
    title: 'Equipamentos de Proteção Individual (EPI)',
    summary:
      'Define obrigações do empregador e do trabalhador quanto ao fornecimento, higienização, guarda e uso de EPIs com Certificado de Aprovação (CA) válido.',
    applicability:
      'Todas as atividades em que as medidas de proteção coletiva (EPC) não forem suficientes ou viáveis.',
    authorizedRoles:
      'Todo trabalhador exposto a agentes de risco físico, químico, biológico ou mecânico.',
    epiEpc:
      'Obrigatório consultar o número do Certificado de Aprovação (CA) no sistema oficial do MTE e registrar a entrega ao trabalhador.',
    officialUrl:
      'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-6-nr-6',
    lastVerified: '25/10/2026',
    isOfficial: true,
    checklist: [
      { id: 'c1', label: 'Consulta da validade do Certificado de Aprovação (CA) no MTE', checked: false },
      { id: 'c2', label: 'Treinamento sobre uso correto, guarda e higienização ministrado', checked: false },
      { id: 'c3', label: 'Registro de entrega assinado na ficha de controle de EPI', checked: false },
      { id: 'c4', label: 'Substituição imediata caso danificado ou extraviado', checked: false },
    ],
  },
  {
    id: 'nr-18',
    code: 'NR-18',
    title: 'Segurança e Saúde no Trabalho na Indústria da Construção',
    summary:
      'Diretrizes administrativas, de planejamento e organização para implementação de medidas de controle nos canteiros de obras.',
    applicability:
      'Canteiros de obras de edificações, reformas, demolições e serviços de engenharia civil em geral.',
    authorizedRoles:
      'Engenheiros, técnicos de segurança, mestres de obras e operários capacitados.',
    epiEpc:
      'Guarda-corpo e rodapé em periferias e vãos, telas de proteção contra projeção, redes de segurança, linha de vida e sinalização.',
    officialUrl:
      'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-18-nr-18',
    lastVerified: '25/10/2026',
    isOfficial: true,
    checklist: [
      { id: 'c1', label: 'PGR (Programa de Gerenciamento de Riscos) da obra implantado', checked: false },
      { id: 'c2', label: 'Instalações sanitárias, vestiários e refeitório em conformidade', checked: false },
      { id: 'c3', label: 'Proteções coletivas em aberturas de piso e bordas instaladas', checked: false },
      { id: 'c4', label: 'Andaimes montados conforme projeto com ART específica', checked: false },
    ],
  },
  {
    id: 'nr-12',
    code: 'NR-12',
    title: 'Segurança no Trabalho em Máquinas e Equipamentos',
    summary:
      'Estabelece requisitos de segurança para máquinas e equipamentos, incluindo proteções fixas e móveis, dispositivos de parada de emergência e procedimentos de operação e manutenção.',
    applicability:
      'Máquinas e equipamentos utilizados em obras, oficinas, serralherias, marcenarias e demais atividades com risco mecânico.',
    authorizedRoles:
      'Operadores capacitados conforme análise de risco e profissionais de manutenção autorizados pelo empregador.',
    epiEpc:
      'Proteções físicas, sensores de segurança, botão de parada de emergência, bloqueio LOTO e EPIs definidos pela análise de risco.',
    officialUrl:
      'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-12-nr-12',
    lastVerified: '25/10/2026',
    isOfficial: true,
    checklist: [
      { id: 'c1', label: 'Análise de risco da máquina documentada e atualizada', checked: false },
      { id: 'c2', label: 'Proteções e dispositivos de segurança testados antes da operação', checked: false },
      { id: 'c3', label: 'Procedimento de bloqueio LOTO disponível para manutenção', checked: false },
      { id: 'c4', label: 'Operador capacitado e autorizado formalmente', checked: false },
    ],
  },
  {
    id: 'nr-33',
    code: 'NR-33',
    title: 'Segurança e Saúde nos Trabalhos em Espaços Confinados',
    summary:
      'Define requisitos para identificação, avaliação, monitoramento e controle de riscos em espaços confinados, incluindo permissão de entrada e resgate.',
    applicability:
      'Reservatórios, caixas d’água, galerias, fossas, tanques e demais espaços sem ventilação adequada e com acesso limitado.',
    authorizedRoles:
      'Trabalhadores autorizados, vigias e supervisores de entrada com capacitação específica em NR-33.',
    epiEpc:
      'Medição prévia da atmosfera, ventilação, detector multigás, tripé com trava-quedas, comunicação e equipe de resgate.',
    officialUrl:
      'https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadoras/normas-regulamentadoras-vigentes/norma-regulamentadora-no-33-nr-33',
    lastVerified: '25/10/2026',
    isOfficial: true,
    checklist: [
      { id: 'c1', label: 'Espaço confinado identificado e sinalizado', checked: false },
      { id: 'c2', label: 'Atmosfera medida antes e durante a entrada', checked: false },
      { id: 'c3', label: 'Permissão de Entrada e Trabalho (PET) emitida', checked: false },
      { id: 'c4', label: 'Vigia e equipe de resgate posicionados', checked: false },
    ],
  },
];

export const REFERENCE_ABNT: ABNTStandardItem[] = [
  {
    id: 'nbr-5410',
    code: 'ABNT NBR 5410',
    title: 'Instalações Elétricas de Baixa Tensão',
    editionYear: '2004 (Confirmada 2021)',
    status: 'Em vigor',
    area: 'Instalações Elétricas',
    summary:
      'Fixa as condições que devem satisfazer as instalações elétricas de baixa tensão (até 1000 V CA / 1500 V CC), a fim de garantir segurança de pessoas e patrimônio.',
    officialUrl: 'https://www.abntcatalogo.com.br/norma.aspx?ID=3487',
    lastVerified: '25/10/2026',
  },
  {
    id: 'nbr-5626',
    code: 'ABNT NBR 5626',
    title: 'Sistemas Prediais de Água Fria e Água Quente — Projeto, execução, operação e manutenção',
    editionYear: '2020',
    status: 'Em vigor',
    area: 'Instalações Hidrossanitárias',
    summary:
      'Especifica exigências de higiene, segurança, economia e conforto para sistemas de água fria e água quente em edificações.',
    officialUrl: 'https://www.abntcatalogo.com.br/norma.aspx?ID=447721',
    lastVerified: '25/10/2026',
  },
  {
    id: 'nbr-6118',
    code: 'ABNT NBR 6118',
    title: 'Projeto de Estruturas de Concreto — Procedimento',
    editionYear: '2023',
    status: 'Em vigor',
    area: 'Estruturas de Engenharia Civil',
    summary:
      'Fixa os requisitos básicos exigíveis para o projeto de estruturas de concreto simples, armado e protendido.',
    officialUrl: 'https://www.abntcatalogo.com.br/norma.aspx?ID=518385',
    lastVerified: '25/10/2026',
  },
  {
    id: 'nbr-15575',
    code: 'ABNT NBR 15575',
    title: 'Edificações Habitacionais — Desempenho (Partes 1 a 6)',
    editionYear: '2021',
    status: 'Em vigor',
    area: 'Desempenho da Construção',
    summary:
      'Estabelece requisitos e critérios de desempenho aplicáveis às edificações habitacionais (estrutural, fogo, estanqueidade, térmico, acústico e lumínico).',
    officialUrl: 'https://www.abntcatalogo.com.br/norma.aspx?ID=478201',
    lastVerified: '25/10/2026',
  },
  {
    id: 'nbr-9050',
    code: 'ABNT NBR 9050',
    title: 'Acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos',
    editionYear: '2020',
    status: 'Em vigor',
    area: 'Acessibilidade',
    summary:
      'Estabelece critérios e parâmetros técnicos para acessibilidade, incluindo rotas acessíveis, dimensões mínimas, sanitários e sinalização.',
    officialUrl: 'https://www.abntcatalogo.com.br/norma.aspx?ID=448423',
    lastVerified: '25/10/2026',
  },
  {
    id: 'nbr-9575',
    code: 'ABNT NBR 9575',
    title: 'Impermeabilização — Seleção e projeto',
    editionYear: '2010',
    status: 'Em vigor',
    area: 'Impermeabilização',
    summary:
      'Estabelece requisitos para seleção e projeto de sistemas de impermeabilização de áreas expostas à água, incluindo detalhes construtivos.',
    officialUrl: 'https://www.abntcatalogo.com.br/norma.aspx?ID=71420',
    lastVerified: '25/10/2026',
  },
];

export const REFERENCE_LEGISLATION: LegislationItem[] = [
  {
    id: 'sp-coe-16642',
    jurisdiction: 'Municipal (SP)',
    code: 'Lei Municipal nº 16.642/2017',
    title: 'Código de Obras e Edificações do Município de São Paulo (COE)',
    year: '2017',
    summary:
      'Disciplina regras gerais para projeto, licenciamento, execução, manutenção e fiscalização de obras no município de SP. Regulamentada pelo Decreto nº 57.776/2017.',
    officialUrl: 'https://legislacao.prefeitura.sp.gov.br/leis/lei-16642-de-9-de-maio-de-2017',
    lastVerified: '25/10/2026',
    dependsOnTownHall: true,
  },
  {
    id: 'sp-cb-63911',
    jurisdiction: 'Estadual (SP)',
    code: 'Decreto Estadual nº 63.911/2018',
    title: 'Regulamento de Segurança contra Incêndio das Edificações e Áreas de Risco do Estado de São Paulo',
    year: '2018',
    summary:
      'Institui normas de proteção e combate a incêndio do Corpo de Bombeiros da Polícia Militar do Estado de São Paulo (CBPMESP).',
    officialUrl:
      'https://www.al.sp.gov.br/repositorio/legislacao/decreto/2018/decreto-63911-10.12.2018.html',
    lastVerified: '25/10/2026',
    dependsOnTownHall: false,
  },
  {
    id: 'fed-pcd-13146',
    jurisdiction: 'Federal',
    code: 'Lei Federal nº 13.146/2015',
    title: 'Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência)',
    year: '2015',
    summary:
      'Assegura e promove a acessibilidade nas edificações de uso coletivo e público, remetendo a projetos conformes à ABNT NBR 9050.',
    officialUrl: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm',
    lastVerified: '25/10/2026',
    dependsOnTownHall: false,
  },
  {
    id: 'fed-cc-10406',
    jurisdiction: 'Federal',
    code: 'Lei Federal nº 10.406/2002 — Arts. 1.299 a 1.313',
    title: 'Código Civil — Do Direito de Construir e Relações de Vizinhança',
    year: '2002',
    summary:
      'Regula o direito de construir, abertura de janelas e vãos a menos de metro e meio do vizinho, escoamento de águas pluviais e paredes-meias.',
    officialUrl: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
    lastVerified: '25/10/2026',
    dependsOnTownHall: true,
  },
  {
    id: 'fed-12305',
    jurisdiction: 'Federal',
    code: 'Lei Federal nº 12.305/2010',
    title: 'Política Nacional de Resíduos Sólidos',
    year: '2010',
    summary:
      'Institui a Política Nacional de Resíduos Sólidos e define responsabilidades pelo gerenciamento de resíduos da construção civil.',
    officialUrl: 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm',
    lastVerified: '25/10/2026',
    dependsOnTownHall: false,
  },
];

export const DIRT_CATALOG: AutomotiveDirtItem[] = [
  {
    id: 'd-1',
    name: 'Gordura e Óleo Pesado',
    category: 'exterior',
    surface: 'Chassis, motor, caixas de roda e suspensão',
    probableOrigin: 'Vazamentos de lubrificantes, graxa de homocinética e fuligem da pista.',
    approach:
      'Pré-lavagem com desengraxante alcalino ou solvente ecológico à base de d-limoneno. Pincelamento detalhado e enxágue com lavadora de alta pressão.',
    cautions: [
      'Nunca aplicar em superfícies de alumínio anodizado polido sem diluição apropriada.',
      'Não deixar o produto secar sobre borrachas e chicotes elétricos.',
      'Proteger alternador e módulo de injeção eletrônica antes de molhar o cofre do motor.',
    ],
    recommendedProduct: 'Desengraxante alcalino concentrado',
  },
  {
    id: 'd-2',
    name: 'Mofo e Ácaros em Tecidos',
    category: 'interior',
    surface: 'Bancos de tecido, carpetes, teto e forro de portas',
    probableOrigin:
      'Umidade acumulada por infiltração no assoalho, derramamento de líquidos ou condensação de ar-condicionado.',
    approach:
      'Higienização por extração mecânica com APC pH neutro/antibacteriano. Secagem completa forçada por soprador térmico ou desumidificador.',
    cautions: [
      'Não saturar o forro de teto com água excessiva para evitar descolamento da espuma/cola original.',
      'Realizar teste prévio em área discreta para verificar firmeza da tintura do tecido.',
    ],
    recommendedProduct: 'APC neutro para estofados',
  },
  {
    id: 'd-3',
    name: 'Chuva Ácida e Marcas Minerais',
    category: 'exterior',
    surface: 'Verniz da pintura e vidros automotivos',
    probableOrigin: 'Gotas de água dura com carbonato de cálcio e sílica que evaporaram sob sol forte.',
    approach:
      'Remoção química com desincrustante ácido balanceado ou polimento físico pontual com boina de microfibra.',
    cautions: [
      'Uso exclusivo em peças frias e à sombra.',
      'Respeitar o tempo de contato do rótulo e enxaguar abundantemente.',
      'Nunca usar em vidros espelhados ou com película antirreflexo externa.',
    ],
    recommendedProduct: 'Removedor de chuva ácida pH ácido controlado',
  },
  {
    id: 'd-4',
    name: 'Contaminação Ferrosa',
    category: 'exterior',
    surface: 'Rodas de liga leve, pinças de freio e painéis laterais de verniz',
    probableOrigin: 'Fuligem quente liberada pelo desgaste das pastilhas e discos de freio durante frenagens.',
    approach:
      'Descontaminante ferroso com indicador óptico de reação (muda de transparente para roxo/violeta).',
    cautions: [
      'Enxaguar completamente antes do produto secar.',
      'Não usar em discos de cerâmica ou peças plásticas cromadas de baixa qualidade.',
    ],
    recommendedProduct: 'Descontaminante ferroso com indicador químico',
  },
];

export const SERVICE_MANUALS: ManualItem[] = [
  {
    id: 'manual-tomada-20a',
    title: 'Instalação de ponto de tomada 20 A',
    category: 'Elétrica',
    summary:
      'Sequência segura para circuito terminal de tomada 20 A, com condutores dimensionados e proteção conforme NBR 5410.',
    sourceLabel: 'Procedimento autoral baseado na ABNT NBR 5410 e NR-10',
    steps: [
      'Desenergizar o circuito, bloquear o disjuntor e comprovar ausência de tensão.',
      'Confirmar a seção dos condutores e a proteção do circuito no projeto executivo.',
      'Passar fase, neutro e terra em eletroduto independente, sem emendas dentro do tubo.',
      'Conectar os terminais respeitando fase, neutro e terra; reapertar com torque adequado.',
      'Fixar suporte e espelho, testar continuidade do PE e energizar com carga controlada.',
    ],
    cautions: [
      'A intervenção exige eletricista qualificado e autorizado conforme NR-10.',
      'Não improvisar condutores, emendas ou adaptadores de tomada.',
    ],
  },
  {
    id: 'manual-aterramento',
    title: 'Verificação de continuidade do condutor de proteção',
    category: 'Elétrica',
    summary:
      'Procedimento de medição de continuidade do PE e conferência do barramento de equipotencialização.',
    sourceLabel: 'Procedimento autoral baseado na ABNT NBR 5410',
    steps: [
      'Desenergizar a instalação e confirmar ausência de tensão.',
      'Identificar o barramento de proteção (PE) e os pontos de equipotencialização.',
      'Medir a continuidade entre o barramento e cada ponto de utilização com instrumento calibrado.',
      'Registrar os valores e corrigir conexões soltas ou condutores interrompidos.',
      'Emitir relatório com data, circuito, valores medidos e responsável técnico.',
    ],
    cautions: [
      'A medição não substitui ensaios de resistência de aterramento.',
      'Valores limites e método devem seguir o projeto e a norma vigente.',
    ],
  },
  {
    id: 'manual-nr35',
    title: 'Preparação de trabalho em altura com linha de vida',
    category: 'Segurança',
    summary:
      'Checklist de preparação para atividade acima de 2,00 m com sistema de ancoragem e resgate.',
    sourceLabel: 'Procedimento autoral baseado na NR-35',
    steps: [
      'Elaborar e assinar a Análise de Risco (AR) e emitir a Permissão de Trabalho (PT).',
      'Inspecionar cinto, talabarte, trava-quedas e ponto de ancoragem antes do uso.',
      'Instalar linha de vida ou ancoragem conforme projeto e profissional habilitado.',
      'Definir equipe, comunicação e plano de resgate antes do acesso.',
      'Suspender a atividade em caso de chuva, vento forte, raios ou condição insegura.',
    ],
    cautions: [
      'O ponto de ancoragem deve ser dimensionado e certificado; nunca usar tubulação ou antena como ancoragem.',
      'Trabalhador suspenso exige resgate imediato para evitar trauma de suspensão.',
    ],
  },
  {
    id: 'manual-diluicao',
    title: 'Preparação e diluição de produtos automotivos',
    category: 'Estética',
    summary:
      'Boas práticas para leitura de rótulo, diluição, EPI e descarte de produtos químicos automotivos.',
    sourceLabel: 'Procedimento autoral baseado na FISPQ/FDS do fabricante',
    steps: [
      'Ler o rótulo e a FISPQ/FDS antes de abrir o produto.',
      'Separar EPIs: luvas de nitrila, óculos e ventilação adequada.',
      'Medir água e produto conforme a proporção do rótulo, adicionando água primeiro.',
      'Identificar o borrifador com nome e proporção; nunca reutilizar embalagem de alimento.',
      'Descartar efluentes conforme a legislação local e a orientação do fabricante.',
    ],
    cautions: [
      'Nunca misturar produtos diferentes ou cloro com ácidos.',
      'Teste em área discreta e interrompa em caso de reação ou dano ao substrato.',
    ],
  },
  {
    id: 'manual-impermeabilizacao',
    title: 'Impermeabilização de área molhada',
    category: 'Hidráulica',
    summary:
      'Etapas de preparo, aplicação e teste de estanqueidade para áreas molhadas.',
    sourceLabel: 'Procedimento autoral baseado na ABNT NBR 9575',
    steps: [
      'Verificar caimento, ralos e regularização do substrato antes da impermeabilização.',
      'Aplicar primer e reforços nos cantos, ralos e tubulações conforme o sistema.',
      'Aplicar as demãos do produto respeitando intervalo e consumo do fabricante.',
      'Executar teste de estanqueidade com lâmina d’água antes do revestimento.',
      'Proteger a membrana durante a execução do revestimento e registrar a garantia.',
    ],
    cautions: [
      'Sistema, consumo e número de demãos devem seguir a ficha técnica do fabricante.',
      'Teste de estanqueidade é obrigatório antes de assentar o revestimento.',
    ],
  },
  {
    id: 'manual-reservatorio',
    title: 'Limpeza e desinfecção de reservatório de água',
    category: 'Hidráulica',
    summary:
      'Procedimento de limpeza de caixa d’água com segurança e controle sanitário.',
    sourceLabel: 'Procedimento autoral baseado na ABNT NBR 5626 e boas práticas sanitárias',
    steps: [
      'Fechar o registro, esvaziar o reservatório e isolar a entrada de água.',
      'Higienizar paredes e fundo com escova e solução de hipoclorito na diluição indicada.',
      'Enxaguar, eliminar resíduos e verificar a integridade da tampa e da ventilação.',
      'Reabrir o abastecimento e registrar data, responsável e produto utilizado.',
      'Programar a próxima limpeza conforme uso e recomendação sanitária local.',
    ],
    cautions: [
      'Espaço confinado exige avaliação de atmosfera e NR-33 quando aplicável.',
      'Não misturar hipoclorito com produtos ácidos ou amoniacais.',
    ],
  },
];

export function createEmptyProject(id = crypto.randomUUID()) {
  return {
    id,
    name: 'Novo projeto',
    type: 'arquitetonica' as const,
    stage: 'estudo_preliminar' as const,
    scale: '1:50',
    updatedAt: new Date().toISOString(),
    walls: [],
    openings: [],
    electrical: [],
    hydraulic: [],
  };
}
