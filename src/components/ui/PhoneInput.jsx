import { Input } from './Input';

/** Champ téléphone : clavier numérique, autocomplétion `tel`. Même API que <Input>. */
const PhoneInput = (props) => <Input type="text" inputMode="tel" autoComplete="tel" {...props} />;
PhoneInput.isAstryxControl = true;

export default PhoneInput;
