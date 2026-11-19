import { Input } from './Input';
import { CURRENCY } from '../../utils/formatters';

/**
 * Champ montant : nombre, pas de 0,01, devise unique (CURRENCY) affichée comme unité.
 * Même API que <Input> (onChange(e) avec e.target.value).
 */
const MoneyInput = ({ min = 0, step = 0.01, ...props }) => (
    <Input type="number" inputMode="decimal" min={min} step={step} suffix={CURRENCY} {...props} />
);
MoneyInput.isAstryxControl = true;

export default MoneyInput;
