/**
 * Utility to export data array to Excel-compatible CSV with UTF-8 BOM.
 *
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Output filename (without extension)
 * @param {Array<{key: string, label: string}>} columns - Optional column mapping
 */
export const exportToCSV = (data, filename = 'export', columns = null) => {
    if (!data || !data.length) {
        alert("Aucune donnée disponible à exporter.");
        return;
    }

    // Determine headers and accessors
    const cols = columns || Object.keys(data[0]).map(k => ({ key: k, label: k }));
    const headers = cols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(';');

    const rows = data.map(item => {
        return cols.map(c => {
            let val = item[c.key];
            if (val === null || val === undefined) val = '';
            else if (typeof val === 'object') val = JSON.stringify(val);
            else val = String(val);
            return `"${val.replace(/"/g, '""')}"`;
        }).join(';');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export default exportToCSV;
