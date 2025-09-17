import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { Offer } from '@/lib/types';

export function downloadCSV(data: Offer[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadXLSX(data: Offer[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Offers');
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx', type: 'binary' });
}
