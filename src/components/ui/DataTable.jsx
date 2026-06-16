export default function DataTable({ columns, data, onRowClick }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <p className="text-gray-400 text-sm">Nenhum registro encontrado.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F5F5F5] border-b border-gray-200">
              {columns.map(col => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i} onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-gray-100 last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-yellow-400/5' : ''}`}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
