import { useState, useMemo } from 'react';
import { History, FileText, PenLine, Package, ClipboardList, Building2, Search, Filter } from 'lucide-react';
import { useContratos } from '../hooks/useContratos';
import { useComprovantes } from '../hooks/useComprovantes';
import { useAssinaturas } from '../hooks/useAssinaturas';
import { useOrdensServico } from '../hooks/useOrdensServico';
import { useEquipamentos } from '../hooks/useEquipamentos';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { formatDateBR } from '../lib/dates';

const tipoIcons = {
  contrato: FileText,
  comprovante: ClipboardList,
  assinatura: PenLine,
  os: Package,
  equipamento: Building2,
};

const tipoColors = {
  contrato: 'bg-blue-100 text-blue-700',
  comprovante: 'bg-green-100 text-green-700',
  assinatura: 'bg-purple-100 text-purple-700',
  os: 'bg-orange-100 text-orange-700',
  equipamento: 'bg-gray-100 text-gray-700',
};

export default function HistoricoTransacoes() {
  const [filtro, setFiltro] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contratos, isLoading: l1 } = useContratos();
  const { data: comprovantes, isLoading: l2 } = useComprovantes();
  const { data: assinaturas, isLoading: l3 } = useAssinaturas();
  const { data: ordens, isLoading: l4 } = useOrdensServico();
  const { data: equipamentos, isLoading: l5 } = useEquipamentos();

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const allTransactions = useMemo(() => {
    const items = [];

    (contratos || []).forEach((ct) => {
      items.push({
        id: ct.id,
        tipo: 'contrato',
        titulo: `Contrato ${ct.numero || ct.id} - ${ct.cliente}`,
        descricao: `${Array.isArray(ct.equipamentos) ? ct.equipamentos.join(', ') : ct.equipamentos || '-'} | R$ ${Number(ct.valorTotal || 0).toLocaleString('pt-BR')}`,
        status: ct.status,
        data: ct.createdAt || ct.dataContrato || '-',
        valor: ct.valorTotal,
        detalhes: { cliente: ct.cliente, atendente: ct.atendente },
      });
    });

    (comprovantes || []).forEach((cp) => {
      items.push({
        id: cp.id,
        tipo: 'comprovante',
        titulo: `Comprovante ${cp.contrato} - ${cp.locatario}`,
        descricao: `${cp.cidade || '-'} | R$ ${Number(cp.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        status: cp.status,
        data: cp.createdAt || '-',
        valor: cp.total,
        detalhes: { endereco: cp.endereco, localEntrega: cp.localEntrega },
      });
    });

    (assinaturas || []).forEach((as) => {
      items.push({
        id: as.id,
        tipo: 'assinatura',
        titulo: `Assinatura - ${as.nomeSignatario}`,
        descricao: `CPF: ${as.cpfSignatario || '-'}`,
        status: 'assinado',
        data: as.dataAssinatura || as.createdAt || '-',
        valor: 0,
        detalhes: { comprovanteId: as.comprovanteId },
      });
    });

    (ordens || []).forEach((os) => {
      items.push({
        id: os.id,
        tipo: 'os',
        titulo: `OS ${os.id} - ${os.cliente}`,
        descricao: `${os.tipo} | ${os.equipamento}`,
        status: os.status,
        data: os.abertura || '-',
        valor: os.valor,
        detalhes: { tecnico: os.tecnico, prioridade: os.prioridade },
      });
    });

    return items.sort((a, b) => {
      const da = a.data && a.data !== '-' ? new Date(a.data) : new Date(0);
      const db = b.data && b.data !== '-' ? new Date(b.data) : new Date(0);
      return db - da;
    });
  }, [contratos, comprovantes, assinaturas, ordens]);

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      if (filtro !== 'all' && t.tipo !== filtro) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          t.titulo.toLowerCase().includes(term) ||
          t.descricao.toLowerCase().includes(term) ||
          t.id.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [allTransactions, filtro, searchTerm]);

  const stats = useMemo(() => ({
    total: allTransactions.length,
    contratos: allTransactions.filter((t) => t.tipo === 'contrato').length,
    comprovantes: allTransactions.filter((t) => t.tipo === 'comprovante').length,
    assinaturas: allTransactions.filter((t) => t.tipo === 'assinatura').length,
    ordens: allTransactions.filter((t) => t.tipo === 'os').length,
  }), [allTransactions]);

  if (isLoading) return <div className="p-6"><TableSkeleton rows={10} cols={5} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Historico de Transacoes</h2>
        <p className="text-sm text-gray-500">{stats.total} transacoes registradas</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Contratos', value: stats.contratos, color: 'bg-blue-100 text-blue-700' },
          { label: 'Comprovantes', value: stats.comprovantes, color: 'bg-green-100 text-green-700' },
          { label: 'Assinaturas', value: stats.assinaturas, color: 'bg-purple-100 text-purple-700' },
          { label: 'OS', value: stats.ordens, color: 'bg-orange-100 text-orange-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar transacao..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'contrato', 'comprovante', 'assinatura', 'os'].map((t) => (
            <button key={t} onClick={() => setFiltro(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filtro === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Descricao</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma transacao encontrada</td></tr>
              ) : (
                filtered.map((t) => {
                  const Icon = tipoIcons[t.tipo] || FileText;
                  return (
                    <tr key={`${t.tipo}-${t.id}`} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoColors[t.tipo]}`}>
                          <Icon className="w-3 h-3" />
                          {t.tipo === 'os' ? 'OS' : t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.titulo}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{t.descricao}</td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.data && t.data !== '-' ? formatDateBR(t.data) : '-'}</td>
                      <td className="px-4 py-3 text-right font-medium">{t.valor ? `R$ ${Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
