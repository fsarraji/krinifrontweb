import React from 'react';

/**
 * Stepper réutilisable.
 * Props:
 * - steps: [{ num, label, icon? }]
 * - currentStep: number
 * - onStepClick?: (num) => void (rend les steps cliquables)
 */
const Stepper = ({ steps, currentStep, onStepClick }) => {
    const stepState = (num) => {
        if (currentStep > num) return 'done';
        if (currentStep === num) return 'active';
        return 'idle';
    };

    return (
        <div className="flex items-center mb-8">
            {steps.map((s, i) => {
                const state = stepState(s.num);
                const clickable = !!onStepClick;
                return (
                    <React.Fragment key={s.num}>
                        {i > 0 && (
                            <div
                                className="step-line mx-4"
                                style={currentStep >= s.num ? { background: 'var(--success)' } : {}}
                            ></div>
                        )}
                        <button
                            type="button"
                            onClick={clickable ? () => onStepClick(s.num) : undefined}
                            disabled={!clickable}
                            className="flex items-center gap-2.5"
                            style={{ cursor: clickable ? 'pointer' : 'default' }}
                        >
                            <div
                                className="step-dot text-white"
                                style={
                                    state === 'done'
                                        ? { background: 'var(--success)' }
                                        : state === 'active'
                                            ? { background: 'var(--primary-container)' }
                                            : { background: 'var(--stroke)', color: 'var(--on-surface-variant)' }
                                }
                            >
                                {state === 'done' ? (
                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                ) : s.icon ? (
                                    <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                                ) : (
                                    s.num
                                )}
                            </div>
                            <span
                                className="text-[13px]"
                                style={
                                    state === 'active'
                                        ? { fontWeight: 700, color: 'var(--primary-container)' }
                                        : { fontWeight: state === 'done' ? 600 : 500, color: state === 'done' ? 'var(--on-surface)' : 'var(--on-surface-variant)', opacity: state === 'idle' ? 0.6 : 1 }
                                }
                            >
                                {s.label}
                            </span>
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Stepper;
