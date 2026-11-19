import React from 'react';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core';
import { useI18n } from '../../i18n/context';
import { materialIcon } from './navIcons';

const MoreIcon = materialIcon('more_vert');

/**
 * Bouton "⋮" avec menu contextuel (Astryx DropdownMenu).
 * items : [{ key, icon, label, destructive, onClick }]
 * `item`, `menuId`, `setMenuId` sont conservés pour compatibilité : l'ouverture est gérée par Astryx.
 */
const MenuButton = ({ items }) => {
    const { t } = useI18n();
    return (
        <DropdownMenu
            button={{
                label: t('u.options'),
                icon: <MoreIcon />,
                variant: 'ghost',
                isIconOnly: true,
            }}
        >
            {items.map((it) => {
                const Icon = it.icon ? materialIcon(it.icon) : null;
                return (
                    <DropdownMenuItem
                        key={it.key}
                        label={it.label}
                        icon={Icon ? <Icon /> : undefined}
                        variant={it.destructive ? 'destructive' : undefined}
                        onClick={() => it.onClick()}
                    />
                );
            })}
        </DropdownMenu>
    );
};

export default MenuButton;
