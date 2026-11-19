import React from 'react';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core';
import { useI18n } from '../../i18n/context';
import { materialIcon } from './navIcons';

const MoreIcon = materialIcon('more_vert');

/**
 * Bouton "⋮" avec menu contextuel (Astryx DropdownMenu).
 * items : [{ key, icon, label, destructive, onClick }]
 * label : nom de la ligne (ex. immatriculation) pour distinguer les boutons identiques au lecteur d'écran.
 */
const MenuButton = ({ items, label }) => {
    const { t } = useI18n();
    return (
        <DropdownMenu
            button={{
                label: label ? `${t('u.options')} — ${label}` : t('u.options'),
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
