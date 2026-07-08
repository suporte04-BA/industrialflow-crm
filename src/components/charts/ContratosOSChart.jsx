import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ContratosOSChart({ data }) {
  if (!data?.meses) return null;

  const chartData = data.meses.map((name, i) => ({
    name,
    Contratos: data.contratosPorMes?.[i] || 0,
    OS: data.osPorMes?.[i] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="Contratos" fill="#EAB308" radius={[4, 4, 0, 0]} />
        <Bar dataKey="OS" fill="#111827" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
