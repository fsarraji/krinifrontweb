import React, { useEffect, useState } from 'react';
import api from '../api';
import { tNow } from '../i18n/runtime';
import { apiErrorText } from '../utils/apiErrorText';
import { formatDateTime } from '../utils/formatters';
import { useI18n } from '../i18n/context';

const TYPE_ICON = { created: 'add_circle', updated: 'edit', deleted: 'delete' };

const formatWhen = (iso) => {
    const out = formatDateTime(iso);
    return out === '—' ? iso : out;
};

/**
 * Historique des modifications d'un objet (qui, quand, quoi), lu depuis /api/audit/.
 * model : contract | payment | vehicle | client | expense
 */
const AuditTimeline = ({ model, id }) => {
    const { t } = useI18n();
    // Résultat associé à la requête (model:id) qui l'a produit : évite d'afficher l'historique
    // d'un autre objet pendant le chargement, sans setState synchrone dans l'effet.
    const typeLabel = { created: t('u.cration'), updated: t('u.modification'), deleted: t('u.suppression') };
    const requestKey = `${model}:${id}`;
    const [result, setResult] = useState({ key: null, entries: null, error: '' });

    useEffect(() => {
        let cancelled = false;
        api.get('audit/', { params: { model, id } })
            .then((res) => {
                if (!cancelled) setResult({ key: requestKey, entries: Array.isArray(res.data) ? res.data : [], error: '' });
            })
            .catch((err) => {
                if (!cancelled) setResult({ key: requestKey, entries: null, error: apiErrorText(err, tNow('u.impossible_de_charger_l_historiq_2')) });
            });
        return () => { cancelled = true; };
    }, [model, id, requestKey]);

    const ready = result.key === requestKey;
    const { entries, error } = ready ? result : { entries: null, error: '' };

    if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
    if (entries === null) return <p role="status" className="text-sm text-slate-500">{t('u.chargement_de_l_historique')}</p>;
    if (entries.length === 0) {
        return <p className="text-sm text-slate-500">{t('u.aucun_historique_enregistr_les_m')}</p>;
    }

    return (
        <ol className="space-y-3">
            {entries.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                    <span className="material-symbols-outlined text-[18px] text-primary mt-0.5" aria-hidden="true">
                        {TYPE_ICON[entry.type] || 'history'}
                    </span>
                    <div className="min-w-0 text-sm">
                        <p className="font-semibold">
                            {typeLabel[entry.type] || entry.type}
                            <span className="ms-2 font-normal text-xs text-slate-500">
                                {formatWhen(entry.date)} · {entry.user || t('u.systme')}
                            </span>
                        </p>
                        {entry.changes?.length > 0 && (
                            <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                                {entry.changes.map((c) => (
                                    <li key={c.field} className="break-words">
                                        <span className="font-semibold">{c.field}</span> : {c.old || '—'} → {c.new || '—'}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
};

export default AuditTimeline;
