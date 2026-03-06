"use client";

type Column<T> = {
  key: string;
  title: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
};

export default function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading,
  emptyMessage,
  emptyAction,
}: {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-b-lg">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#e8e8e8] bg-[#f5f4f0]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-5 py-4 font-semibold text-[#333]"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-[#888]"
              >
                加载中…
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-12 text-center text-[#666]"
              >
                {emptyMessage ?? "暂无数据"}
                {emptyAction && <span className="ml-2">{emptyAction}</span>}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[#f0f0f0] transition-colors hover:bg-[#f5f4f0]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-5 py-4 text-[#444]"
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
