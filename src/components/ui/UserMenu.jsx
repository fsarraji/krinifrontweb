import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, DropdownMenu, DropdownMenuDivider, DropdownMenuItem } from '@astryxdesign/core';
import { logout } from '../../api';
import { useI18n } from '../../i18n/context';
import { materialIcon } from './navIcons';

const SettingsIcon = materialIcon('settings');
const LogoutIcon = materialIcon('logout');

// Menu du compte (Astryx DropdownMenu) : avatar + nom, accès aux paramètres et déconnexion.
const UserMenu = ({ userName = 'Utilisateur', userRole = 'Admin', agencyName = '', collapsed = false }) => {
    const { t } = useI18n();
    const navigate = useNavigate();

    return (
        <DropdownMenu
            button={{
                label: collapsed ? userName : `${userName} · ${userRole || 'Admin'}`,
                icon: <Avatar name={userName} size="sm" />,
                variant: 'ghost',
                isIconOnly: collapsed,
            }}
        >
            <DropdownMenuItem label={`${userName} — ${agencyName || userRole}`} isDisabled />
            <DropdownMenuItem label={t('u.paramtres')} icon={<SettingsIcon />} onClick={() => navigate('/settings')} />
            <DropdownMenuDivider />
            <DropdownMenuItem label={t('u.dconnexion')} icon={<LogoutIcon />} variant="destructive" onClick={() => logout()} />
        </DropdownMenu>
    );
};

export default UserMenu;
