import React from 'react';
import { UserAccount } from '../types';
import { formatCurrency } from '../utils/helpers';

interface PriceDisplayProps {
    value: number;
    user: UserAccount | null;
    className?: string;
}

/**
 * Component that displays a price value, masking it if user doesn't have view_financials permission.
 * Admins always see values. Uses monospace font and blur effect for masked state.
 */
const PriceDisplay: React.FC<PriceDisplayProps> = ({ value, user, className = '' }) => {
    const canView = user?.role === 'admin' || user?.permissions?.view_financials;

    if (!canView) {
        return (
            <span
                className={`${className} font-mono text-slate-400 select-none blur-[2px] hover:blur-none transition-all duration-300`}
                title="Valor restrito"
            >
                R$ ****,**
            </span>
        );
    }

    return <span className={className}>{formatCurrency(value)}</span>;
};

export default PriceDisplay;
