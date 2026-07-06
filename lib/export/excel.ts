export type SheetRow = Record<string, string | number | boolean | null>;

export function todayFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

export async function loadXlsx() {
  const XLSX = await import("xlsx");
  return XLSX;
}

export async function downloadWorkbook(
  sheets: Array<{ name: string; rows: SheetRow[] }>,
  filename: string
) {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(workbook, filename);
}
