import React, { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { formatBrazilianDate, maskBrazilianDate, parseBrazilianDate } from '../utils/billingPeriod';

type BrazilianDateInputProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (isoDate: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
};

export default function BrazilianDateInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  min,
  max,
  className = 'billing-field w-full',
  disabled,
}: BrazilianDateInputProps) {
  const controlled = value !== undefined;
  const initialIso = parseBrazilianDate(controlled ? value : defaultValue) || '';
  const [iso, setIso] = useState(initialIso);
  const [text, setText] = useState(() => formatBrazilianDate(initialIso));
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (!controlled) return;
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    const nextIso = parseBrazilianDate(value) || '';
    setIso(nextIso);
    setText(nextIso ? formatBrazilianDate(nextIso) : '');
  }, [controlled, value]);

  const validate = (el: HTMLInputElement | null, rawText: string, parsedIso: string | null) => {
    if (!el) return;
    if (!rawText.trim()) {
      el.setCustomValidity('');
      return;
    }
    if (!parsedIso || rawText.trim().length !== 10) {
      el.setCustomValidity('Informe a data válida no formato DD/MM/AAAA.');
      return;
    }
    if (min && parsedIso < min) {
      el.setCustomValidity(`A data deve ser igual ou posterior a ${formatBrazilianDate(min)}.`);
      return;
    }
    if (max && parsedIso > max) {
      el.setCustomValidity(`A data não pode ser posterior a ${formatBrazilianDate(max)}.`);
      return;
    }
    el.setCustomValidity('');
  };

  useEffect(() => {
    validate(inputRef.current, text, iso || null);
  }, [text, iso, min, max]);

  const handleTextChange = (raw: string) => {
    const masked = maskBrazilianDate(raw);
    setText(masked);
    if (!masked) {
      setIso('');
      validate(inputRef.current, masked, null);
      prevValueRef.current = '';
      onChange?.('');
      return;
    }
    const parsed = masked.length === 10 ? parseBrazilianDate(masked) : null;
    if (parsed) {
      setIso(parsed);
      validate(inputRef.current, masked, parsed);
      prevValueRef.current = parsed;
      onChange?.(parsed);
    } else {
      setIso('');
      validate(inputRef.current, masked, null);
    }
  };

  const handlePickerChange = (pickedIso: string) => {
    const parsed = parseBrazilianDate(pickedIso) || '';
    const formatted = formatBrazilianDate(parsed);
    setIso(parsed);
    setText(formatted);
    validate(inputRef.current, formatted, parsed || null);
    prevValueRef.current = parsed;
    onChange?.(parsed);
  };

  return (
    <div className="relative mt-1.5">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder="DD/MM/AAAA"
        required={required}
        disabled={disabled}
        value={text}
        onChange={e => handleTextChange(e.target.value)}
        className={`${className} !mt-0 pr-11`}
      />
      {name && <input type="hidden" name={name} value={iso} />}
      <label
        aria-label="Selecionar data no calendário"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded text-slate-600 hover:text-slate-900 cursor-pointer"
      >
        <Calendar size={18} aria-hidden="true" />
        <input
          type="date"
          tabIndex={-1}
          disabled={disabled}
          min={min}
          max={max}
          value={iso}
          onChange={e => handlePickerChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </label>
    </div>
  );
}
