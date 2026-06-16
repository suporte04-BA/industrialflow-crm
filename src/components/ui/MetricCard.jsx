export default function MetricCard({ title, value, subtitle, icon: Icon, accent = false, trend }) {
  return (
    <div className={`rounded-xl p-5 flex flex-col gap-3 shadow-sm border ${accent ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'bg-white text-[#1C1C1C] border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-medium uppercase tracking-wider ${accent ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? 'bg-yellow-400/20' : 'bg-yellow-400/10'}`}>
            <Icon size={16} className="text-yellow-400" />
          </div>
        )}
      </div>
      <div>
        <p className={`text-3xl font-bold ${accent ? 'text-white' : 'text-[#1C1C1C]'}`}>{value}</p>
        {subtitle && <p className={`text-xs mt-1 ${accent ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
      </div>
      {trend && (
        <p className={`text-xs font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs. mes anterior
        </p>
      )}
    </div>
  );
}
