import { useI18n } from '../../i18n/LanguageContext';
import { formatDisplayExpression } from '../../lib/format';
import type { CalcState } from '../../lib/calculator';
import styles from './customers.module.css';

interface CalculatorProps {
  state: CalcState;
  disabled?: boolean;
  onNumber: (n: string) => void;
  onOperator: (op: string) => void;
  onPercent: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onEquals: () => void;
  onPaid: () => void;
  onUnpaid: () => void;
}

export function Calculator({
  state,
  disabled,
  onNumber,
  onOperator,
  onPercent,
  onBackspace,
  onClear,
  onEquals,
  onPaid,
  onUnpaid,
}: CalculatorProps) {
  const { t, localizeDigits } = useI18n();

  const num = (n: string) => (
    <button
      className={`${styles.key} ${styles.keyNum}`}
      onClick={() => onNumber(n)}
      disabled={disabled}
    >
      {n === '.' ? '.' : localizeDigits(n)}
    </button>
  );

  const op = (symbol: string, value: string) => (
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
    <div>
      <div className={styles.calcDisplay}>
        <div className={styles.calcValue}>{localizeDigits(state.display || '0')}</div>
        <div className={styles.calcExpr}>
          {localizeDigits(formatDisplayExpression(state.expression))}
        </div>
      </div>

      <div className={styles.keypad}>
        {/* Row 1 */}
        <button className={`${styles.key} ${styles.keyClear}`} onClick={onClear} disabled={disabled}>
          {t.allClear}
        </button>
        <button
          className={`${styles.key} ${styles.keyFunc}`}
          onClick={onBackspace}
          disabled={disabled}
          aria-label="backspace"
        >
          <span className="material-symbols-outlined">backspace</span>
        </button>
        <button
          className={`${styles.key} ${styles.keyOp}`}
          onClick={onPercent}
          disabled={disabled}
          aria-label="percent"
        >
          %
        </button>
        <button className={`${styles.key} ${styles.keyUnpaid}`} onClick={onUnpaid} disabled={disabled}>
          {t.unpaid}
        </button>

        {/* Row 2 */}
        {num('7')}
        {num('8')}
        {num('9')}
        <button className={`${styles.key} ${styles.keyPaid}`} onClick={onPaid} disabled={disabled}>
          {t.paid}
        </button>

        {/* Row 3 */}
        {num('4')}
        {num('5')}
        {num('6')}
        {op('×', '*')}
        {op('÷', '/')}

        {/* Row 4 */}
        {num('1')}
        {num('2')}
        {num('3')}
        {op('−', '-')}
        <button
          className={`${styles.key} ${styles.keyPlus}`}
          onClick={() => onOperator('+')}
          disabled={disabled}
          aria-label="+"
        >
          +
        </button>

        {/* Row 5 */}
        {num('.')}
        {num('0')}
        {num('00')}
        <button
          className={`${styles.key} ${styles.keyFunc}`}
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
