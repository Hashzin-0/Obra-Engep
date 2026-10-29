export type ContractCategory = 'trabalhista' | 'servicos' | 'construcao' | 'rural' | 'imobiliario' | 'comercial' | 'empresarial' | 'patrimonial' | 'protecao' | 'civil' | 'educacional';

export interface ContractField {
  key: string;
  label: string;
  required: boolean;
  multiline?: boolean;
}

export interface LegalSource {
  name: string;
  articles: string;
  url: string;
  note: string;
}

export interface ContractPartyDuty {
  party: string;
  duties: string;
}

export interface ContractModel {
  id: string;
  title: string;
  category: ContractCategory;
  regime: string;
  description: string;
  when: string;
  parties: ContractPartyDuty[];
  sources: LegalSource[];
  fields: ContractField[];
  clauses: string[];
  warnings: string[];
}

export interface GeneratedContract {
  id: string;
  modelId: string;
  title: string;
  content: string;
  fields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
