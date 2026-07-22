import { useI18n } from '../../i18n/LanguageContext';
import { formatDisplayExpression } from '../../lib/format';
import type { CalcState } from '../../lib/calculator';
import styles from './customers.module.css';

interface CalculatorProps {
  state: CalcState;
  disabled?: boolean;
  /** When set, shown in red on the display's expression line instead of the expression. */
  error?: string | null;
  onNumber: (n: string) => void;
  onOperator: (op: string) => void;
  onPercent: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onEquals: () => void;
}

export function Calculator({
  state,
  disabled,
  error,
  onNumber,
  onOperator,
  onPercent,
  onBackspace,
  onClear,
  onEquals,
}: CalculatorProps) {
  const { t, localizeDigits } = useI18n();

  const Num = ({ n }: { n: string }) => (
    <button className={`${styles.key} ${styles.keyNum}`} onClick={() => onNumber(n)} disabled={disabled}>
      {n === '.' ? '.' : localizeDigits(n)}
    </button>
  );

  const Op = ({ symbol, value }: { symbol: string; value: string }) => (
    <button
      className={`${styles.key} ${styles.keyOp}`}
      onClick={() => onOperator(value)}
      disabled={disabled}
      aria-label={value}
    >
      {symbol}
    </button>
  );

  return (
    <div className={styles.calc}>
      <div className={styles.calcDisplay}>
        <div className={styles.calcExpr}>
          {error ? (
            <span className={styles.calcError}>{error}</span>
          ) : (
            localizeDigits(formatDisplayExpression(state.expression))
          )}
        </div>
        <div className={styles.calcValue}>{localizeDigits(state.display || '0')}</div>
      </div>

      <div className={styles.keys}>
        {/* Row 1 */}
        <button className={`${styles.key} ${styles.keyFn}`} onClick={onClear} disabled={disabled}>
          {t.allClear}
        </button>
        <button
          className={`${styles.key} ${styles.keyFn}`}
          onClick={onBackspace}
          disabled={disabled}
          aria-label="backspace"
        >
          <span className="material-symbols-outlined">backspace</span>
        </button>
        <button className={`${styles.key} ${styles.keyFn}`} onClick={onPercent} disabled={disabled} aria-label="percent">
          %
        </button>
        <Op symbol="÷" value="/" />

        {/* Row 2 */}
        <Num n="7" />
        <Num n="8" />
        <Num n="9" />
        <Op symbol="×" value="*" />

        {/* Row 3 */}
        <Num n="4" />
        <Num n="5" />
        <Num n="6" />
        <Op symbol="−" value="-" />

        {/* Row 4 */}
        <Num n="1" />
        <Num n="2" />
        <Num n="3" />
        <Op symbol="+" value="+" />

        {/* Row 5 */}
        <Num n="00" />
        <Num n="0" />
        <Num n="." />
        <button
          className={`${styles.key} ${styles.keyEquals}`}
          onClick={onEquals}
          disabled={disabled}
          aria-label="equals"
        >
          =
        </button>
      </div>
    </div>
  );
}
