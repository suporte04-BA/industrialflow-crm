import { useState, useCallback } from 'react';

/**
 * DateInput with auto DD/MM/YYYY formatting
 * Auto-inserts "/" as user types digits
 */
export default function DateInput({ value, onChange, placeholder = 'DD/MM/AAAA', className = '', ...props }) {
  const formatInput = useCallback((raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }, []);

  const formatted = formatInput(value || '');
  const [localValue, setLocalValue] = useState(formatted);
  const isInternalUpdate = localValue === formatted;

  const displayValue = isInternalUpdate ? localValue : formatted;

  const handleChange = (e) => {
    const raw = e.target.value;
    const newFormatted = formatInput(raw);
    setLocalValue(newFormatted);
    onChange?.(newFormatted);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const raw = displayValue.replace(/\D/g, '');
      const newRaw = raw.slice(0, -1);
      const newFormatted = formatInput(newRaw);
      setLocalValue(newFormatted);
      onChange?.(newFormatted);
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      maxLength={10}
      className={className}
      {...props}
    />
  );
}
