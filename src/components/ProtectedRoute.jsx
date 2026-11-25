import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Layout from './Layout';
import { CLIENT_ROLE, STAFF_ROLES, getClaims, hasSession } from '../utils/session';

// Garde de route du personnel : session requise, rôle staff requis (un CLIENT est renvoyé vers son espace),
// et `roles` permet de restreindre une route (ex. ['SUPERADMIN'] pour /admin/*).
export default function ProtectedRoute({ roles }) {
    if (!hasSession()) return <Navigate to="/login" replace />;
    const role = getClaims()?.role;
    if (role === CLIENT_ROLE) return <Navigate to="/espace-client" replace />;
    if (!STAFF_ROLES.includes(role)) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
    return (
        <Layout>
            <Outlet />
        </Layout>
    );
}
