import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import ClientLayout from './ClientLayout';
import { CLIENT_ROLE, getClaims, hasSession, homePathFor } from '../../utils/session';

// Garde de l'espace client : session requise, rôle CLIENT requis.
// Le personnel est renvoyé vers son tableau de bord ; sans session, vers la connexion.
export default function ClientRoute() {
    if (!hasSession()) return <Navigate to="/login" replace />;
    const role = getClaims()?.role;
    if (role !== CLIENT_ROLE) return <Navigate to={homePathFor(role)} replace />;
    return (
        <ClientLayout>
            <Outlet />
        </ClientLayout>
    );
}
