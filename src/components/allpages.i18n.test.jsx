import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import I18nProvider from '../i18n/I18nProvider';
import Calendar from './Calendar';
import Maintenance from './Maintenance';
import Invoices from './Invoices';
import Reports from './Reports';
import Expenses from './Expenses';
import Subscriptions from './Subscriptions';
import UserManagement from './UserManagement';
import AgencyManagement from './AgencyManagement';
import AddClient from './AddClient';
import NotFound from './NotFound';

// Toutes les requêtes renvoient une liste vide : on vérifie le rendu (sans plantage) en arabe.
vi.mock('../api', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        patch: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
    },
    fetchAllPages: vi.fn().mockResolvedValue([]),
    logout: vi.fn(),
}));
vi.mock('./Toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('./MessageBox', () => ({ messageBox: { confirm: vi.fn(), danger: vi.fn(), ask: vi.fn() } }));

const renderAr = (ui) => {
    localStorage.setItem('lang', 'ar');
    return render(
        <MemoryRouter>
            <I18nProvider>{ui}</I18nProvider>
        </MemoryRouter>,
    );
};

describe('pages rendered in Arabic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each([
        ['Calendar', <Calendar />, 'المخطط التفاعلي (غانت)'],
        ['Maintenance', <Maintenance />, 'تدخّل جديد'],
        ['Invoices', <Invoices />, 'الفواتير والإشعارات الدائنة'],
        ['Reports', <Reports />, 'التقارير'],
        ['Expenses', <Expenses />, 'إضافة مصروف'],
        ['Subscriptions', <Subscriptions />, 'إدارة الاشتراكات'],
        ['UserManagement', <UserManagement />, 'إدارة المستخدمين'],
        ['AgencyManagement', <AgencyManagement />, 'إدارة الوكالات'],
        ['AddClient', <AddClient />, 'إضافة عميل'],
        ['NotFound', <NotFound />, 'الصفحة غير موجودة'],
    ])('%s shows its Arabic title', async (_name, ui, expected) => {
        renderAr(ui);
        await waitFor(() => expect(screen.getAllByText(expected).length).toBeGreaterThan(0));
        expect(document.documentElement.dir).toBe('rtl');
    });

    it('Calendar keeps the timeline left-to-right inside an RTL page', async () => {
        renderAr(<Calendar />);
        await screen.findByText('المخطط التفاعلي (غانت)');
        expect(document.querySelector('[dir="ltr"]')).not.toBeNull();
    });
});
