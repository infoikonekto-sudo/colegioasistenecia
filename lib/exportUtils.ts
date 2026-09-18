// Utilities para exportación de datos
import { Empleado, Marcaje } from '@/types';

export interface ExportData {
  empleados: Empleado[];
  marcajes: Marcaje[];
  fechaInicio: string;
  fechaFin: string;
}

// Exportar a CSV
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Headers
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value || '';
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `${filename}.csv`);
};

// Exportar a JSON
export const exportToJSON = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadFile(blob, `${filename}.json`);
};

// Exportar a Excel (Real xlsx)
export const exportToExcel = async (data: any[] | Record<string, any[]>, filename: string) => {
  if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
    alert('No hay datos para exportar');
    return;
  }

  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    if (Array.isArray(data)) {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    } else {
      Object.entries(data).forEach(([sheetName, sheetData]) => {
        const ws = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
      });
    }
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    alert('Hubo un problema al generar el archivo Excel.');
  }
};

// Generar HTML para impresión
export const generateHTMLReport = (
  title: string,
  data: any[],
  columns: { key: string; label: string }[]
): string => {
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .header { 
        background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); 
        color: white; 
        padding: 20px; 
        text-align: center;
        margin-bottom: 20px;
      }
      .header h1 { font-size: 24px; margin-bottom: 5px; }
      .header p { font-size: 12px; opacity: 0.9; }
      .date { 
        padding: 10px 20px; 
        background: #f3f4f6; 
        font-size: 12px; 
        margin-bottom: 20px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 20px;
      }
      th { 
        background: #f3f4f6; 
        padding: 12px; 
        text-align: left; 
        font-weight: 600;
        border-bottom: 2px solid #d1d5db;
      }
      td { 
        padding: 10px 12px; 
        border-bottom: 1px solid #e5e7eb;
      }
      tr:hover { background: #f9fafb; }
      .footer { 
        margin-top: 30px; 
        padding-top: 20px; 
        border-top: 1px solid #d1d5db;
        font-size: 12px; 
        color: #6b7280;
        text-align: center;
      }
    </style>
  `;

  const tableHTML = `
    <table>
      <thead>
        <tr>
          ${columns.map((col) => `<th>${col.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
      .map(
        (row) => `
          <tr>
            ${columns.map((col) => `<td>${row[col.key] || '-'}</td>`).join('')}
          </tr>
        `
      )
      .join('')}
      </tbody>
    </table>
  `;

  const footer = `
    <div class="footer">
      <p>© 2026 Colegio Manos a la Obra - Sistema de Asistencia Biométrica</p>
      <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Colegio Manos a la Obra</p>
      </div>
      <div class="date">
        <strong>Fecha de Reporte:</strong> ${new Date().toLocaleDateString('es-ES')}
      </div>
      ${tableHTML}
      ${footer}
    </body>
    </html>
  `;
};

// Imprimir reporte
export const printReport = (html: string, title: string) => {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
};


// Descargar archivo
const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
