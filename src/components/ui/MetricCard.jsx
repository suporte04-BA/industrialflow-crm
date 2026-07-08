import { ChevronDown } from 'lucide-react';

const accentStyles = {
  yellow: { bg: 'bg-[#1C1C1C]', text: 'text-white', iconBg: 'bg-yellow-400/20', iconColor: 'text-yellow-400', labelColor: 'text-gray-400' },
  blue: { bg: 'bg-white', text: 'text-gray-900', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', labelColor: 'text-gray-500' },
  green: { bg: 'bg-white', text: 'text-gray-900', iconBg: 'bg-green-100', iconColor: 'text-green-600', labelColor: 'text-gray-500' },
  red: { bg: 'bg-white', text: 'text-gray-900', iconBg: 'bg-red-100', iconColor: 'text-red-600', labelColor: 'text-gray-500' },
  default: { bg: 'bg-white', text: 'text-gray-900', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', labelColor: 'text-gray-500' },
};

export default function MetricCard({ title, value, subtitle, icon: Icon, accent = 'default', trend, onClick }) {
  const style = accentStyles[accent] || accentStyles.default;
  const isDark = accent === 'yellow';

  return (
    <div className={`rounded-xl flex flex-col shadow-sm border transition-all hover:shadow-md cursor-pointer active:scale-[0.98] ${isDark ? `${style.bg} ${style.text} border-gray-800` : `${style.bg} ${style.text} border-gray-100`}`} onClick={onClick}>
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <p className={`text-xs font-medium uppercase tracking-wider ${style.labelColor}`}>{title}</p>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.iconBg}`}>
                <Icon size={16} className={style.iconColor} />
              </div>
            )}
            <ChevronDown size={14} className={style.labelColor} />
          </div>
        </div>
        <div>
          <p className={`text-3xl font-bold ${style.text}`}>{value}</p>
          {subtitle && <p className={`text-xs mt-1 ${style.labelColor}`}>{subtitle}</p>}
        </div>
        {trend != null && (
          <p className={`text-xs font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs. mes anterior
          </p>
        )}
      </div>
    </div>
  );
}
