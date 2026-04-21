import * as XLSX from 'xlsx';

// Helper for robust downloading with explicit filename (for Excel)
const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportToExcel = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, `${filename.replace(/[^a-z0-9_-]/gi, '_')}.xlsx`);
};

/**
 * Professional PDF Export using Native Browser Print Engine.
 * 
 * How it works:
 * 1. The PrintableReport component is always rendered but hidden (display: none)
 * 2. When window.print() is called, @media print CSS rules:
 *    - Hide the entire website UI
 *    - Show only the PrintableReport with professional formatting
 * 3. The browser's native engine handles Arabic perfectly (ligatures, RTL, fonts)
 * 4. User selects "Save as PDF" in the print dialog
 */
export const exportComponentToPDF = () => {
    window.print();
};
