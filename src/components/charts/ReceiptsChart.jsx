import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const RADIAN = Math.PI / 180;

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function ReceiptsChart({ data }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) return (
    <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
      Nenhum comprovante registrado
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color || '#EAB308'} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => `${v} comprovante(s)`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
