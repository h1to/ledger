import { useEffect, useRef, useState } from 'react';
import { fmtNum, parseAmt } from '../lib/format';

interface TextCellProps {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  placeholder?: string;
  list?: string;
}

/** Uncontrolled-feeling text cell: local state while typing, commits on blur. */
export function TextCell({ value, onCommit, className, placeholder, list }: TextCellProps) {
  const [text, setText] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);
  return (
    <input
      className={className}
      list={list}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        last.current = text;
        onCommit(text);
      }}
    />
  );
}

interface MoneyInputProps {
  value: number | undefined;
  onCommit: (v: number) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  /** Show empty instead of "0.00" when the value is 0/undefined. */
  blankZero?: boolean;
}

/**
 * A text amount field (no spinners) that formats on blur and commits a parsed
 * number. Local state avoids cursor jumps while typing; it re-syncs when the
 * underlying model value changes externally.
 */
export function MoneyInput({ value, onCommit, className, placeholder = '0.00', title, blankZero = true }: MoneyInputProps) {
  const display = (v: number | undefined) => (v && v > 0 ? fmtNum(v) : blankZero ? '' : fmtNum(v || 0));
  const [text, setText] = useState(() => display(value));
  const last = useRef(value);

  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(display(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      title={title}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        // Commit live so a value is never lost to a blur-vs-click race in modals; reformatting
        // is deferred to blur so grouping separators don't fight the cursor mid-type.
        const v = parseAmt(raw);
        last.current = v;
        onCommit(v);
      }}
      onBlur={() => {
        const v = parseAmt(text);
        last.current = v;
        setText(v > 0 ? fmtNum(v) : blankZero ? '' : fmtNum(v));
        onCommit(v);
      }}
    />
  );
}
