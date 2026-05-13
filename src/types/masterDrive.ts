// src/types/masterDrive.ts

export interface Colaborador {
  id: string;
  nome_completo: string;
  funcao_atual: string;
  cpf: string;
  matricula: string;
  ativo: boolean;
}

export interface TipoTreinamento {
  id: string;
  nome: string;
  codigo: string;
  descricao?: string;
  ativo: boolean;
}

// Removemos TopicoTreinamento como entidade separada
// Agora o tópico será um texto livre

export interface Treinamento {
  id: string;
  tipo_treinamento_id: string;
  tipo_treinamento?: TipoTreinamento;
  topico_treinamento: string; // Agora é string (texto livre)
  equipamento: string;
  data_treinamento: string;
  carga_horaria_base: string; // formato "HH:MM:SS" - horas por colaborador
  carga_horaria_total: string; // calculado = base × qtd_participantes
  instrutor?: string;
  local?: string;
  observacoes?: string;
  qtd_participantes: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
  participantes?: Colaborador[];
}

export interface ParticipanteTreinamento {
  id: string;
  treinamento_id: string;
  colaborador_id: string;
  colaborador?: Colaborador;
  created_at: string;
}

export interface Desvio {
  id: string;
  colaborador_id: string;
  colaborador?: Colaborador;
  data_desvio: string;
  descricao: string;
  tipo_desvio?: string;
  responsavel?: string;
  situacao: 'EM_ABERTO' | 'TRATADO' | 'CANCELADO';
  data_tratamento?: string;
  tratamento_descricao?: string;
  tratado_por?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FiltrosMasterDrive {
  dataInicio?: string;
  dataFim?: string;
  colaboradorId?: string;
  funcao?: string;
  tipoTreinamentoId?: string;
  topico?: string; // Agora é string para filtro
  situacaoDesvio?: string;
}

export interface Indicadores {
  totalHorasTreinamento: number;
  totalTreinamentos: number;
  totalParticipantes: number;
  totalDesvios: number;
  desviosAbertos: number;
  desviosTratados: number;
  horasPorTipo: Array<{ tipo: string; horas: number }>;
  treinamentosPorTopico: Array<{ topico: string; quantidade: number }>;
  evolucaoMensal: Array<{ mes: string; horas: number; desvios: number }>;
  rankingColaboradores: Array<{ nome: string; horas: number }>;
}

// NOVA INTERFACE: ColaboradorTreinado para o Relatório Geral
export interface ColaboradorTreinado {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  colaborador_funcao: string;
  treinamento_id: string;
  topico: string;
  data_treinamento: string;
  carga_horaria: number;
  tipo_treinamento: string;
  status: string;
}