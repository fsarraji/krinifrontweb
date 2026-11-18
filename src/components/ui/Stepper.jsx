import React from 'react';
import { Step, Stepper as AstryxStepper } from '@astryxdesign/core';

/**
 * Stepper (composant Astryx), API historique.
 * - steps: [{ num, label, subtitle?, icon? }]  (num commence à 1)
 * - currentStep: number (1-indexé)
 * - onStepClick?: (num) => void (rend les étapes cliquables)
 */
const Stepper = ({ steps, currentStep, onStepClick }) => (
    <div className="mb-6">
        <AstryxStepper
            label="Progression"
            activeStep={currentStep - 1}
            onStepClick={onStepClick ? (index) => onStepClick(index + 1) : undefined}
        >
            {steps.map((s, i) => (
                <Step key={s.num} step={i} label={s.label} description={s.subtitle} />
            ))}
        </AstryxStepper>
    </div>
);

export default Stepper;
