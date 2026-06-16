export const ordensServico = [
  { id: 'OS-001', cliente: 'Construtora Alpha Ltda', equipamento: 'Retroescavadeira CAT 416', tipo: 'Manutencao Preventiva', status: 'em_andamento', prioridade: 'alta', tecnico: 'Carlos Silva', abertura: '2026-04-20', previsao: '2026-04-25', valor: 3200 },
  { id: 'OS-002', cliente: 'Mineracao Beta S/A', equipamento: 'Escavadeira Komatsu PC200', tipo: 'Reparo Emergencial', status: 'pendente', prioridade: 'urgente', tecnico: 'Joao Mendes', abertura: '2026-04-22', previsao: '2026-04-24', valor: 8500 },
  { id: 'OS-003', cliente: 'Agro Gamma Fazendas', equipamento: 'Trator New Holland TL5.90', tipo: 'Revisao Geral', status: 'concluido', prioridade: 'normal', tecnico: 'Paulo Costa', abertura: '2026-04-15', previsao: '2026-04-18', valor: 1800 },
  { id: 'OS-004', cliente: 'Prefeitura de Campinas', equipamento: 'Compactador Dynapac CA250', tipo: 'Inspecao Tecnica', status: 'pendente', prioridade: 'normal', tecnico: 'Ricardo Lima', abertura: '2026-04-23', previsao: '2026-04-28', valor: 650 },
  { id: 'OS-005', cliente: 'Construtora Delta', equipamento: 'Grua Liebherr 130 EC-B', tipo: 'Manutencao Corretiva', status: 'em_andamento', prioridade: 'alta', tecnico: 'Carlos Silva', abertura: '2026-04-21', previsao: '2026-04-26', valor: 12000 },
  { id: 'OS-006', cliente: 'Logistica Epsilon', equipamento: 'Empilhadeira Toyota 7FBH', tipo: 'Manutencao Preventiva', status: 'concluido', prioridade: 'normal', tecnico: 'Joao Mendes', abertura: '2026-04-10', previsao: '2026-04-12', valor: 980 },
  { id: 'OS-007', cliente: 'Siderurgica Zeta', equipamento: 'Pa Carregadeira Volvo L90H', tipo: 'Reparo de Hidraulica', status: 'cancelado', prioridade: 'alta', tecnico: 'Paulo Costa', abertura: '2026-04-08', previsao: '2026-04-10', valor: 4200 },
  { id: 'OS-008', cliente: 'Petro Eta Servicos', equipamento: 'Perfuratriz Sandvik', tipo: 'Substituicao de Pecas', status: 'em_andamento', prioridade: 'urgente', tecnico: 'Ricardo Lima', abertura: '2026-04-22', previsao: '2026-04-27', valor: 22000 },
];

export const equipamentos = [
  { id: 'EQ-001', nome: 'Retroescavadeira CAT 416', categoria: 'Terraplanagem', status: 'locado', cliente: 'Construtora Alpha Ltda', contrato: 'CT-001', locacaoInicio: '2026-03-01', locacaoFim: '2026-06-30', valorMensal: 8500, horasUso: 342, ultimaRevisao: '2026-03-15' },
  { id: 'EQ-002', nome: 'Escavadeira Komatsu PC200', categoria: 'Escavacao', status: 'manutencao', cliente: '-', contrato: '-', locacaoInicio: '-', locacaoFim: '-', valorMensal: 0, horasUso: 1205, ultimaRevisao: '2026-02-20' },
  { id: 'EQ-003', nome: 'Trator New Holland TL5.90', categoria: 'Agricola', status: 'disponivel', cliente: '-', contrato: '-', locacaoInicio: '-', locacaoFim: '-', valorMensal: 0, horasUso: 876, ultimaRevisao: '2026-04-18' },
  { id: 'EQ-004', nome: 'Compactador Dynapac CA250', categoria: 'Compactacao', status: 'locado', cliente: 'Prefeitura de Campinas', contrato: 'CT-003', locacaoInicio: '2026-04-01', locacaoFim: '2026-04-30', valorMensal: 3200, horasUso: 128, ultimaRevisao: '2026-04-01' },
  { id: 'EQ-005', nome: 'Grua Liebherr 130 EC-B', categoria: 'Icamento', status: 'locado', cliente: 'Construtora Delta', contrato: 'CT-004', locacaoInicio: '2026-02-15', locacaoFim: '2026-08-15', valorMensal: 18000, horasUso: 560, ultimaRevisao: '2026-03-01' },
  { id: 'EQ-006', nome: 'Empilhadeira Toyota 7FBH', categoria: 'Movimentacao', status: 'disponivel', cliente: '-', contrato: '-', locacaoInicio: '-', locacaoFim: '-', valorMensal: 0, horasUso: 2100, ultimaRevisao: '2026-04-12' },
  { id: 'EQ-007', nome: 'Pa Carregadeira Volvo L90H', categoria: 'Terraplanagem', status: 'locado', cliente: 'Mineracao Beta S/A', contrato: 'CT-002', locacaoInicio: '2026-01-10', locacaoFim: '2026-07-10', valorMensal: 12000, horasUso: 980, ultimaRevisao: '2026-03-20' },
  { id: 'EQ-008', nome: 'Perfuratriz Sandvik', categoria: 'Mineracao', status: 'manutencao', cliente: '-', contrato: '-', locacaoInicio: '-', locacaoFim: '-', valorMensal: 0, horasUso: 430, ultimaRevisao: '2026-04-05' },
];

export const contratos = [
  { id: 'CT-001', cliente: 'Construtora Alpha Ltda', cnpj: '12.345.678/0001-90', equipamentos: ['Retroescavadeira CAT 416'], inicio: '2026-03-01', fim: '2026-06-30', valorTotal: 34000, valorMensal: 8500, status: 'ativo', assinado: true, vencimentoDias: 67 },
  { id: 'CT-002', cliente: 'Mineracao Beta S/A', cnpj: '98.765.432/0001-10', equipamentos: ['Pa Carregadeira Volvo L90H'], inicio: '2026-01-10', fim: '2026-07-10', valorTotal: 72000, valorMensal: 12000, status: 'ativo', assinado: true, vencimentoDias: 77 },
  { id: 'CT-003', cliente: 'Prefeitura de Campinas', cnpj: '45.678.901/0001-23', equipamentos: ['Compactador Dynapac CA250'], inicio: '2026-04-01', fim: '2026-04-30', valorTotal: 3200, valorMensal: 3200, status: 'vencendo', assinado: true, vencimentoDias: 6 },
  { id: 'CT-004', cliente: 'Construtora Delta', cnpj: '23.456.789/0001-45', equipamentos: ['Grua Liebherr 130 EC-B'], inicio: '2026-02-15', fim: '2026-08-15', valorTotal: 108000, valorMensal: 18000, status: 'ativo', assinado: false, vencimentoDias: 113 },
  { id: 'CT-005', cliente: 'Agro Gamma Fazendas', cnpj: '67.890.123/0001-67', equipamentos: ['Trator New Holland TL5.90'], inicio: '2025-10-01', fim: '2026-03-31', valorTotal: 28800, valorMensal: 4800, status: 'vencido', assinado: true, vencimentoDias: -24 },
  { id: 'CT-006', cliente: 'Logistica Epsilon', cnpj: '34.567.890/0001-89', equipamentos: ['Empilhadeira Toyota 7FBH'], inicio: '2026-04-15', fim: '2026-10-15', valorTotal: 14400, valorMensal: 2400, status: 'ativo', assinado: false, vencimentoDias: 174 },
];

export const metricas = {
  totalOS: 8,
  osAbertas: 5,
  osConcluidas: 2,
  equipamentosLocados: 4,
  equipamentosDisponiveis: 2,
  equipamentosManutencao: 2,
  contratosAtivos: 4,
  contratosVencendo: 1,
  contratosVencidos: 1,
  receitaMensal: 44100,
  receitaMes: [30000, 38000, 42000, 35000, 44100, 0],
  meses: ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'],
};
