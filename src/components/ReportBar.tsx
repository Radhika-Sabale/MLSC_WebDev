import React from 'react';
import type { CrowdLevel } from '../lib/api';

export interface ReportBarProps {
  disabled?: boolean;
  disabledMessage?: string;
  onReport: (level: CrowdLevel) => void;
  submitting?: boolean;
  submittingLevel?: CrowdLevel | null;
}

interface ButtonOption {
  level: CrowdLevel;
  label: string;
  symbol: string;
}

const BUTTON_OPTIONS: ButtonOption[] = [
  { level: 1, label: 'Under 5 min', symbol: '●' },
  { level: 2, label: '5 to 15 min', symbol: '■' },
  { level: 3, label: '15+ min', symbol: '▲' },
];

/**
 * ReportBar provides a thumb-friendly fixed bottom interaction area
 * containing 56px+ tap targets for one-tap queue reporting.
 * Respects phone viewport safe area insets (e.g. iPhone bottom home indicator).
 */
export const ReportBar: React.FC<ReportBarProps> = ({
  disabled = false,
  disabledMessage,
  onReport,
  submitting = false,
  submittingLevel = null,
}) => {
  return (
    <aside className="report-bar-wrapper" aria-label="Queue time reporting area">
      <div className="report-bar-container">
        <h2 className="report-bar-heading" id="report-bar-prompt">
          How long is the queue right now?
        </h2>

        {disabledMessage && (
          <p className="report-bar-disabled-msg" id="report-bar-disabled-msg" role="status">
            {disabledMessage}
          </p>
        )}

        <div
          className="report-bar-buttons"
          role="group"
          aria-labelledby="report-bar-prompt"
        >
          {BUTTON_OPTIONS.map((option) => {
            const isThisSubmitting = submitting && submittingLevel === option.level;
            const isButtonDisabled = disabled || submitting;

            return (
              <button
                key={option.level}
                type="button"
                className={`report-btn report-btn-level-${option.level} ${isThisSubmitting ? 'is-submitting' : ''}`}
                disabled={isButtonDisabled}
                aria-disabled={isButtonDisabled}
                aria-describedby={disabledMessage ? 'report-bar-disabled-msg' : undefined}
                aria-busy={isThisSubmitting ? 'true' : undefined}
                onClick={() => onReport(option.level)}
                aria-label={`Report queue time: ${option.label}`}
              >
                <span className="report-btn-symbol" aria-hidden="true">
                  {option.symbol}
                </span>
                <span className="report-btn-text">
                  {isThisSubmitting ? 'Submitting…' : option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
