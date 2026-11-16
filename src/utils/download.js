import api from '../api';
import { toast } from '../components/Toast';

// Télécharge un fichier protégé (PDF/CSV) via l'instance axios authentifiée.
export const downloadFile = async (url, filename, params = {}) => {
    try {
        const res = await api.get(url, { params, responseType: 'blob' });
        const blobUrl = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error('Téléchargement échoué', err);
        toast.error('Le téléchargement a échoué.');
    }
};

// Ouvre un PDF dans un nouvel onglet.
export const openPdf = async (url) => {
    try {
        const res = await api.get(url, { responseType: 'blob' });
        const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        window.open(blobUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
        console.error('Ouverture PDF échouée', err);
        toast.error('Impossible de générer le PDF.');
    }
};

export const fmtMoney = (v) =>
    `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
