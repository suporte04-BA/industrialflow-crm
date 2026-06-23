// snake_case <-> camelCase converters for Supabase data

const SNAKE_TO_CAMEL = {
  id: 'id',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  cliente: 'cliente',
  equipamento: 'equipamento',
  tipo: 'tipo',
  status: 'status',
  prioridade: 'prioridade',
  tecnico: 'tecnico',
  abertura: 'abertura',
  previsao: 'previsao',
  valor: 'valor',
  observacoes: 'observacoes',
  nome: 'nome',
  categoria: 'categoria',
  contrato: 'contrato',
  locacao_inicio: 'locacaoInicio',
  locacao_fim: 'locacaoFim',
  valor_mensal: 'valorMensal',
  horas_uso: 'horasUso',
  ultima_revisao: 'ultimaRevisao',
  cnpj: 'cnpj',
  valor_total: 'valorTotal',
  assinado: 'assinado',
  inicio: 'inicio',
  fim: 'fim',
  atendente: 'atendente',
  locatario: 'locatario',
  cpf: 'cpf',
  rg: 'rg',
  fone: 'telefone',
  contato: 'contato',
  endereco: 'endereco',
  numero: 'numero',
  bairro: 'bairro',
  cidade: 'cidade',
  estado: 'estado',
  cep: 'cep',
  local_entrega: 'localEntrega',
  telefone_entrega: 'telefoneEntrega',
  data: 'data',
  hora: 'hora',
  itens: 'itens',
  total: 'total',
  observacao: 'observacao',
  data_assinatura: 'dataAssinatura',
  nome_signatario: 'nomeSignatario',
  created_by_id: 'createdById',
  comprovante_id: 'comprovanteId',
  cpf_signatario: 'cpfSignatario',
  assinatura_imagem: 'assinaturaImagem',
  ip_address: 'ipAddress',
  titulo: 'titulo',
  conteudo: 'conteudo',
  full_name: 'fullName',
  avatar_url: 'avatarUrl',
  role: 'role',
  contrato_id: 'contratoId',
  destinatario: 'destinatario',
  assunto: 'assunto',
  corpo: 'corpo',
  erro_msg: 'erroMsg',
  telefone: 'telefone',
  email: 'email',
  numero_endereco: 'numeroEndereco',
  data_contrato: 'dataContrato',
  hora_contrato: 'horaContrato',
};

const CAMEL_TO_SNAKE = {};
for (const [k, v] of Object.entries(SNAKE_TO_CAMEL)) {
  if (v !== k) CAMEL_TO_SNAKE[v] = k;
}

export function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = SNAKE_TO_CAMEL[key] || key;
    result[camelKey] = value;
  }
  return result;
}

export function toSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = CAMEL_TO_SNAKE[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

export function computeVencimentoDias(dataFim) {
  if (!dataFim) return null;
  const hoje = new Date();
  const fim = new Date(dataFim);
  const diff = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
  return diff;
}
