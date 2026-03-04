export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const csvContent = bom + [
        headers.join(';'),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${formatDateForFile(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export function printReport() {
    window.print();
}

function formatDateForFile(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}
