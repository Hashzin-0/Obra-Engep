# Plano de privacidade, segurança e conformidade — OBra ENGEP

**Estado:** implementação técnica em andamento; identificação do controlador e validação jurídica final pendentes.  
**Escopo:** PWA React/TypeScript, Vercel, Supabase Auth/PostgreSQL, Google OAuth, Gemini, Web Push e armazenamento local (localStorage).

> Documento de engenharia e minuta operacional. Não substitui análise jurídica, inventário contratual nem decisão do controlador sobre bases legais. Não afirmar conformidade integral até que as evidências e configurações externas sejam verificadas.

## 1. Classificação baseada em evidências

Categorias confirmadas: aplicação de IA (SDK Google GenAI e endpoints Gemini); workspace/editor visual (editor de planta baixa e projetos); aplicação com dados pessoais (Supabase Auth, perfis, feedback, projetos, preferências e inscrições push); PWA (service worker, instalação e armazenamento offline).

Não demonstradas no código examinado: checkout, cobrança, assinaturas, Google Analytics, pixels de publicidade, depoimentos ou publicidade integrada. Não implementar regras comerciais fictícias para funcionalidades inexistentes.

## 2. Inventário preliminar de dados e operações (ROPA)

| Operação | Dados / titulares | Finalidade observada | Base legal candidata (confirmar pelo controlador) | Sistemas |
|---|---|---|---|---|
| Autenticação Google | ID do provedor, nome, e-mail, avatar | Criar e manter conta | Execução de contrato/procedimentos preliminares; validar | Supabase Auth / Google |
| Sessão anônima | ID aleatório e sessão | Salvar/sincronizar sem login Google | Execução de funcionalidades solicitadas; avaliar legítimo interesse | Supabase Auth |
| Projetos e editor | Plantas, instalações, objetos e metadados | Criar, armazenar e sincronizar | Execução de contrato | Supabase / armazenamento local |
| Cálculos, favoritos, notas, checklists e prazos | Dados inseridos e histórico funcional | Persistência e continuidade | Execução de contrato | Supabase / localStorage |
| Feedback | Mensagem, usuário e e-mail opcional | Suporte e correção | Execução de contrato ou legítimo interesse conforme contexto | Supabase |
| Push | Endpoint, chaves Web Push, user-agent e usuário | Entregar notificações solicitadas | Permissão específica e base legal a validar | Navegador / Supabase |
| Segurança e rate limiting | IP em processamento, hash HMAC, método, rota, bucket e usuário | Prevenir abuso e proteger API | Legítimo interesse com teste de balanceamento; obrigação legal quando aplicável | Vercel / Supabase |
| IA Gemini | Prompt e conteúdo enviado pelo usuário | Executar função de IA solicitada | Execução de contrato; avaliar qualquer uso secundário | Google Gemini |
| Telemetria publicitária | Não identificada | Não aplicável atualmente | Não aplicável | Nenhum SDK identificado |

### Minimização
- Enviar ao Gemini somente campos necessários à tarefa.
- Não enviar tokens, credenciais, segredos ou dados privados sem necessidade.
- Não coletar e-mail de contato em feedback se a resposta puder ser entregue no aplicativo.
- Evitar persistir IP bruto; manter somente sinais técnicos necessários e protegidos.
- Não habilitar analytics, pixels ou publicidade sem avaliação de finalidade, base legal, aviso e mecanismo de escolha.

## 3. Matriz LGPD — leitura por artigo

### Capítulo I — Disposições preliminares
- **Art. 1º:** aplica-se ao tratamento de dados pessoais, inclusive digital, observadas as hipóteses legais.
- **Art. 2º:** princípios de privacidade, autodeterminação informativa, liberdade e inviolabilidade da intimidade.
- **Art. 3º:** verificar âmbito territorial quando o serviço é oferecido a pessoas no Brasil ou coleta dados aqui.
- **Art. 4º:** verificar exceções legais; não presumir que um SaaS comercial se enquadre nelas.
- **Art. 5º:** classificar dado pessoal/sensível, titular, controlador, operador, encarregado, tratamento e anonimização.
- **Art. 6º:** documentar finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação e responsabilização.

### Capítulo II — Tratamento de dados pessoais
- **Art. 7º:** mapear uma hipótese legal por finalidade; execução de contrato para funcionalidades solicitadas e legítimo interesse para segurança são candidatos, não conclusões automáticas.
- **Art. 8º:** se consentimento for a base, registrar manifestação livre, informada, inequívoca, finalidade determinada e prova; não usar caixas pré-marcadas.
- **Art. 9º:** informar finalidade, forma/duração, controlador, contato, compartilhamentos, responsabilidades e direitos.
- **Art. 10:** documentar necessidade e balanceamento do legítimo interesse; respeitar expectativas e direitos.
- **Arts. 11–13:** não há finalidade de tratamento de dados sensíveis identificada como necessária; se surgir, fazer avaliação específica.
- **Arts. 14–16:** se o serviço passar a tratar dados de crianças/adolescentes, aplicar melhor interesse e salvaguardas; definir retenção e término do tratamento.

### Capítulo III — Direitos do titular
- **Art. 17:** direitos fundamentais de liberdade, intimidade e privacidade.
- **Art. 18:** processo para confirmação, acesso, correção, anonimização/bloqueio/eliminação quando cabível, portabilidade, informação sobre compartilhamento e revogação.
- **Art. 19:** atender confirmação/acesso conforme prazos e modalidades legais, com resposta simplificada ou declaração completa quando aplicável.
- **Art. 20:** oferecer revisão e informações sobre critérios/procedimentos de decisões unicamente automatizadas que afetem interesses, quando aplicável.
- **Arts. 21–22:** proteger dados usados no exercício de direitos e observar tutela judicial coletiva.

### Capítulo IV — Poder público
- **Arts. 23–32:** verificar somente se o produto vier a operar tratamento por pessoa jurídica de direito público ou em política pública. Não presumir aplicabilidade ao SaaS privado.

### Capítulo V — Transferência internacional
- **Arts. 33–36:** identificar destinos e mecanismo legal válido antes de transferir dados; avaliar adequação, garantias, cláusulas contratuais ou outra hipótese regulamentada.
- **Resolução CD/ANPD nº 19/2024:** conferir cláusulas-padrão brasileiras, documentação, transparência e responsabilidades. Confirmar DPA e suboperadores de Supabase, Vercel e Google; não presumir que termos genéricos bastam.

### Capítulo VI — Agentes de tratamento
- **Art. 37:** manter registro das operações por finalidade, inclusive para agentes de pequeno porte, observadas regras simplificadas.
- **Art. 38:** avaliar e elaborar RIPD quando solicitado pela ANPD e preventivamente quando o risco justificar.
- **Art. 39:** operadores devem tratar dados segundo instruções lícitas do controlador.
- **Art. 40:** observar padrões de interoperabilidade e portabilidade quando regulamentados.
- **Art. 41:** definir canal/encarregado ou hipótese de dispensa; mesmo quando dispensado, manter canal efetivo com titulares.
- **Arts. 42–45:** avaliar responsabilidade; contratos devem definir instruções, segurança, incidentes, suboperadores e cooperação.

### Capítulo VII — Segurança e boas práticas
- **Arts. 46–49:** medidas técnicas e administrativas desde a concepção; controle de acesso, autenticação, RLS, segredos, logs redigidos, backups, testes, atualização e proteção contra acesso não autorizado.
- **Art. 48:** comunicar incidente que possa acarretar risco ou dano relevante à ANPD e titulares no prazo regulamentar.
- **Resolução CD/ANPD nº 15/2024:** triagem, documentação, comunicação e conservação de registros de incidentes por pelo menos cinco anos; prazo geral regulamentar de três dias úteis, observadas exceções e regras vigentes.
- **Art. 50:** programa de governança proporcional, política de segurança, responsabilidades, treinamento, supervisão e plano de resposta.
- **Art. 51:** acompanhar padrões técnicos e boas práticas.

### Capítulo VIII — Fiscalização e sanções
- **Arts. 52–54:** avaliar risco de sanções e manter evidências; não anunciar certificação sem auditoria verificável.

### Capítulos IX e X
- **Arts. 55-A a 55-L:** competências da ANPD.
- **Arts. 58–65:** conselhos, vigência e disposições finais; monitorar alterações e regulamentações posteriores.

## 4. Outras normas aplicáveis

### Marco Civil da Internet — Lei nº 12.965/2014
- **Art. 7º:** direitos de privacidade, inviolabilidade e informações claras.
- **Art. 10:** guarda e disponibilização de registros e dados conforme a lei e ordem competente.
- **Art. 11:** aplicação da legislação brasileira às operações de coleta/armazenamento/tratamento nos casos legais.
- **Art. 15:** guarda de registros de acesso a aplicações por seis meses para provedor profissional constituído na forma da lei, sob sigilo e segurança. Confirmar enquadramento e responsabilidade; não confundir com logs de negócio.
- **Arts. 16–17:** restrições de guarda e exceções para provedores de conexão.

### Código de Defesa do Consumidor — Lei nº 8.078/1990
Aplicável quando houver relação de consumo:
- **Art. 6º, III:** informação adequada e clara.
- **Arts. 30–31:** vinculação da oferta e informações corretas, claras, precisas e ostensivas.
- **Art. 35:** consequências do descumprimento da oferta.
- **Art. 39:** práticas abusivas.
- **Art. 46:** conhecimento prévio do contrato.
- **Art. 49:** arrependimento em contratações fora do estabelecimento, conforme requisitos legais.
- **Art. 51:** nulidade de cláusulas abusivas.
- **Arts. 52–54:** crédito, financiamento e contratos de adesão quando aplicáveis.
Não há checkout/assinatura confirmados no código atual; não publicar preços, reembolsos ou cancelamento fictícios.

### Lei Brasileira de Inclusão — Lei nº 13.146/2015
- **Art. 63:** acessibilidade em sítios mantidos por empresas com sede ou representação comercial no Brasil e órgãos de governo, conforme requisitos legais.
- Referência técnica: WCAG 2.2 AA, incluindo teclado, foco visível, contraste, nomes acessíveis, mensagens de erro, zoom e alternativas textuais. A auditoria deve ser executada por rota e componente.

## 5. Política preliminar de retenção

Os prazos abaixo são propostas de engenharia, não prazos legais universais. O controlador deve aprovar, ajustar e implementar exclusão automática.

| Categoria | Regra proposta | Observação |
|---|---|---|
| Conta ativa e projetos | Enquanto conta ativa ou até exclusão solicitada | Backups seguem ciclo próprio |
| Feedback | 12 meses após resolução, salvo necessidade documentada | Remover e-mail quando desnecessário |
| Logs de segurança | 6 meses como referência inicial | Validar art. 15 do Marco Civil e enquadramento |
| Eventos de incidente | Pelo menos 5 anos quando abrangidos pela Resolução 15/2024 | Acesso restrito |
| Inscrições push | Até revogação, invalidação ou exclusão da conta | Remover endpoints inválidos |
| Backups | Ciclo definido pelo fornecedor e contrato | Não prometer eliminação imediata de cópias imutáveis |
| Dados locais | Sob controle do usuário/navegador | Instruir limpeza/exportação |

## 6. Segurança — controles e ações

### Controles observados no repositório
- RLS nas tabelas públicas e políticas de propriedade individual.
- app_metadata.is_admin para autorização administrativa no servidor.
- Sessões administrativas com cookie HttpOnly/Secure/SameSite e duração limitada.
- Rate limiting distribuído para /api/* via middleware e RPC privada.
- Limites de tamanho e validação de payload.
- Proteção de endpoints push e validação de hosts para reduzir SSRF.
- Bucket user-media privado e uploads cloud desabilitados no fluxo descrito em SECURITY.md.
- HSTS, nosniff, frame denial, Referrer-Policy, Permissions-Policy e CSP Report-Only.
- Workflow CI com typecheck, build, testes e auditoria de dependências.

### Ações necessárias
1. Confirmar configuração de leaked-password protection no plano Supabase e habilitar se disponível/necessário.
2. Revisar autenticação anônima, CAPTCHA/abuso e associação de dados anônimos à conta Google.
3. Exigir JWT válido nos endpoints Gemini que não sejam deliberadamente públicos; aplicar quotas por usuário e limites de custo.
4. Verificar plano gratuito/pago Gemini e documentar termos efetivos, retenção e uso de prompts.
5. Revalidar CORS das Edge Functions e restringir origens conforme ambientes reais.
6. Manter CSP em Report-Only até coletar relatórios e testar OAuth, Gemini, PWA, mídia e editor; depois migrar para enforcement.
7. Automatizar secret scanning, SCA, Dependabot e revisão de PR; corrigir vulnerabilidades sem downgrade incompatível.
8. Testar RLS com usuários distintos e sessão anônima; incluir IDOR, XSS, CSRF, SQLi, SSRF, abuso de rate limit e vazamento de segredos.
9. Confirmar backups, RPO/RTO e teste de restauração Supabase.
10. Manter plano de resposta a incidentes e contatos de escalonamento dos fornecedores.

## 7. Governança de IA
- Identificar provedor e função de cada recurso.
- Informar quando a resposta é gerada por IA e pode conter erros.
- Não apresentar conteúdo gerado como projeto executivo, laudo, cálculo certificado ou substituto de profissional habilitado.
- Não usar dados do usuário para treinamento próprio sem base legal e transparência.
- Tratar conteúdo recuperado e anexos como dados não confiáveis; não aceitar prompt injection de arquivos.
- Limitar contexto, tokens, duração, concorrência e custo.
- Fornecer revisão humana e correção de respostas incorretas.
- Avaliar art. 20 da LGPD quando decisões unicamente automatizadas afetarem interesses.

## 8. Acessibilidade — checklist WCAG 2.2 AA
- [ ] Todo fluxo pode ser operado por teclado.
- [ ] Ordem de foco acompanha a ordem visual e não cria armadilhas.
- [ ] Foco visível e não encoberto por menus/modais.
- [ ] Contraste mínimo de texto e componentes verificado por ferramenta.
- [ ] Ícones funcionais têm nome acessível; decorativos são ocultados.
- [ ] Imagens informativas têm texto alternativo contextual.
- [ ] Formulários têm rótulos persistentes e erros associados.
- [ ] Estados assíncronos usam aria-live ou role=status quando apropriado.
- [ ] Zoom/reflow até 200% e viewport estreito sem perda de conteúdo.
- [ ] Alvos de toque respeitam tamanho e espaçamento aplicáveis.
- [ ] Movimento respeita prefers-reduced-motion.
- [ ] Cor não é o único meio de transmitir estado.
- [ ] Canvas/editor possui alternativa para teclado ou limitações documentadas.
- [ ] Testes manuais com leitor de tela e teclado executados.

## 9. Direitos autorais e licenças
Manter inventário de código próprio e licença Apache-2.0 declarada, dependências/licenças, ícones, fontes, imagens, modelos 3D e catálogos. Respeitar direitos autorais da ABNT; não redistribuir normas integrais sem licença. Imagens fornecidas por usuários não devem ser reutilizadas em publicidade sem autorização específica.

## 10. Pendências para ativação jurídica
- Razão social/nome do controlador, CPF/CNPJ, endereço e canal de privacidade.
- Confirmação do enquadramento como agente de pequeno porte e eventual dispensa de encarregado.
- Bases legais finais por finalidade e teste de legítimo interesse.
- DPA, suboperadores, países e mecanismo de transferência dos fornecedores.
- Plano/termos efetivos da API Gemini.
- Prazos finais de retenção e política de backup.
- Fluxo testado de exportação, correção e exclusão de conta/dados.
- Termos de Uso e política de propriedade intelectual.
- Se houver monetização futura: oferta, preço total, renovação, cancelamento, reembolso e CDC.
- Revisão jurídica e aprovação formal do controlador.

## 11. Fontes oficiais
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD — legislação: https://www.gov.br/anpd/pt-br/assuntos/legislacao
- ANPD — cookies: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
- ANPD — segurança para agentes de pequeno porte: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte
- Marco Civil: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- CDC: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- LBI: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Supabase DPA: https://supabase.com/legal/customer-resources/data-processing-addendum
- Vercel DPA: https://vercel.com/legal/dpa
- Google Gemini API Terms: https://ai.google.dev/gemini-api/terms

## 12. Critério de conclusão
Um requisito só pode ser marcado como implementado quando houver evidência no código/configuração/contrato, teste reproduzível, responsável/procedimento quando necessário e ausência de dependência crítica não resolvida. A existência deste documento ou da tela de privacidade não equivale a conformidade integral.


## 8. Fluxos LGPD implementados nesta etapa

### Direitos e solicitações
- A Central de Privacidade permite registrar pedidos de acesso/confirmação, correção, eliminação, portabilidade, informação sobre compartilhamentos e outros.
- Cada solicitação é vinculada à sessão autenticada e recebe status inicial `received`. A equipe responsável deverá analisar e atualizar o status por fluxo administrativo autorizado; a interface não simula conclusão.
- O histórico do titular é visível apenas à própria conta e a administradores com claim confiável em `app_metadata`.
- Os registros de solicitação são eliminados junto com a conta por FK `ON DELETE CASCADE`. Se o controlador definir obrigação de retenção probatória após encerramento, deverá aprovar outro desenho de retenção/pseudonimização antes de ativá-lo.

### Exportação
- O usuário pode baixar JSON com perfil, dados em tabelas vinculadas à conta, conteúdo global de autoria própria que a política RLS permita consultar e backup local do OBra ENGEP no navegador atual.
- As consultas são paginadas em blocos de 500 e dependem de RLS. Falhas de leitura interrompem a exportação; o sistema não gera arquivo parcial como se fosse completo.
- O arquivo inclui chaves de inscrição push e dados de projeto pertencentes à própria conta; deve ser tratado como dado pessoal e guardado com segurança.
- O Storage binário não é incorporado ao JSON. O bucket privado `user-media` está sem objetos e sem caminho de upload ativo no momento da inspeção; os metadados de `project_media` são exportados.

### Exclusão
- A Edge Function `delete-account` exige JWT válido, confirmação textual e correspondência entre o ID enviado e o usuário autenticado. A função usa service role exclusivamente no servidor.
- Para contas não anônimas, exige `auth_time` de até 15 minutos; sessões antigas precisam de novo login antes da exclusão. Sessões anônimas exigem confirmação textual e JWT válido, pois não possuem credencial externa para reautenticação.
- Antes da exclusão, lista e remove arquivos sob o prefixo do usuário no bucket privado `user-media`, encerra sessões globais via Auth e solicita exclusão do usuário pelo endpoint administrativo.
- As tabelas pessoais com FK para `auth.users` usam `ON DELETE CASCADE`; registros de autoria de conteúdo compartilhado com `ON DELETE SET NULL` preservam o catálogo/avisos globais sem manter a associação ao autor.
- A operação atravessa Storage e Auth e não é transacional entre serviços. Em falha de remoção de arquivos, a conta é preservada. Se o logout global ocorrer e a exclusão Auth falhar, o usuário precisará autenticar novamente para repetir a solicitação.
- Tokens de acesso já emitidos podem permanecer válidos até expirarem, conforme documentação Supabase; a exclusão das linhas e a revogação de refresh sessions reduzem o impacto, mas não prometem invalidação instantânea do JWT.

### Registro de consentimento
- O fluxo de ativar/desativar Web Push registra eventos imutáveis em `privacy_consent_events`, com finalidade, ação, versão do aviso, origem e data.
- A tabela não registra consentimento para analytics, marketing ou cookies: esses tratamentos não foram identificados no código.
- Eventos são apagados com a conta. A retenção pós-exclusão depende de decisão jurídica do controlador.

## 9. Remediação dos Advisors

- `app_updates_admin_read` e `app_updates_read` foram consolidadas em uma política SELECT única `app_updates_select_published_or_admin`, com `(select auth.jwt())` para avaliar o claim uma vez por statement.
- O warning `auth_rls_initplan` e o warning `multiple_permissive_policies` deixaram de aparecer na leitura posterior do Performance Advisor.
- Os seis avisos INFO de tabelas do schema privado permanecem intencionais: não há políticas de cliente e as tabelas são acessadas apenas por funções privilegiadas.
- Os índices reportados como não utilizados foram preservados. Estatísticas de uso zeradas em um projeto com poucas linhas/tráfego não demonstram que os índices de FK ou de filtros sejam inúteis. Os dois índices novos de histórico LGPD também podem aparecer como não utilizados até haver consultas reais.
- O warning de proteção contra senhas comprometidas continua pendente de configuração no painel Supabase. O conector disponível nesta execução não oferece operação de escrita para Auth Security settings; habilitar no Dashboard em Authentication → Settings → Password Security → Leaked Password Protection, se o plano do projeto oferecer o recurso, e executar novamente o Security Advisor.

## 10. Limitações e ações do controlador

- Os dados do responsável legal, CPF/CNPJ, endereço e canal oficial permanecem pendentes por decisão do responsável do Obra-Engep.
- Não foi configurado prazo de retenção automática: ainda faltam bases legais finais, contratos de suboperadores, destinos internacionais e validação do responsável. Não excluir automaticamente registros de negócio com prazo arbitrário.
- Solicitações não são marcadas como concluídas automaticamente. A equipe responsável deve verificar identidade proporcionalmente, avaliar a hipótese legal, responder e atualizar o status.
- A exclusão apaga registros vinculados à conta; cópias de segurança do provedor seguem a retenção contratual própria e não são apagadas instantaneamente por esta função.
- A exportação inclui dados locais do navegador atual, que são armazenados por algumas chaves globais do aplicativo e não possuem metadado de titular independente para cada item. O arquivo identifica esse bloco como `deviceData`; revisar manualmente se o dispositivo foi usado por mais de uma conta.


**Nota de inventário:** a dependência `idb-keyval` consta no `package.json`, mas não foram encontrados usos de IndexedDB no código-fonte consultado. O fluxo de exclusão remove as chaves `obra_engep_*` do localStorage e remove bancos IndexedDB apenas se algum banco futuro usar esse prefixo; não apaga bancos de outras aplicações.
