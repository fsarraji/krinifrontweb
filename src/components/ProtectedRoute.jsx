import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Layout from './Layout';
import { STAFF_ROLES, getClaims, hasSession } from '../utils/session';

// Garde de route : session requise, rôle staff requis (les comptes CLIENT sont refusés),
// et `roles` permet de restreindre une route (ex. ['SUPERADMIN'] pour /admin/*).
export default function ProtectedRoute({ roles }) {
    if (!hasSession()) return <Navigate to="/login" replace />;
    const role = getClaims()?.role;
    if (!STAFF_ROLES.includes(role)) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
    return (
        <Layout>
            <Outlet />
        </Layout>
    );
}
