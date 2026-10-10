import React, { useState, useEffect, useRef } from 'react';

interface FastInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FastInput = React.memo(({ 
  value, 
  onChange, 
  name, 
  className, 
  type = "text", 
  ...props 
}: FastInputProps) => {
  const [localValue, setLocalValue] = useState(value ?? '');
  const timerRef = useRef<any>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    const prevEmpty = !localValue;
    const nowEmpty = !val;

    // If crossing empty <-> non-empty boundary, update immediately for button validation state
    if (prevEmpty !== nowEmpty) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onChange(e);
    } else {
      // 35ms micro-debounce prevents mobile UI thread blocking and eliminate typing lag
      if (timerRef.current) clearTimeout(timerRef.current);
      const synthEvent = {
        ...e,
        target: { ...e.target, name: name || e.target.name, value: val }
      } as React.ChangeEvent<HTMLInputElement>;
      timerRef.current = setTimeout(() => {
        onChange(synthEvent);
      }, 35);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    const synthEvent = {
      ...e,
      target: { ...e.target, name: name || e.target.name, value: localValue }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(synthEvent);
    if (props.onBlur) props.onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    if (props.onFocus) props.onFocus(e);
  };

  return (
    <input
      type={type}
      name={name}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      className={className}
      {...props}
    />
  );
});

interface FastTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const FastTextarea = React.memo(({ 
  value, 
  onChange, 
  name, 
  className, 
  ...props 
}: FastTextareaProps) => {
  const [localValue, setLocalValue] = useState(value ?? '');
  const timerRef = useRef<any>(null);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    const prevEmpty = !localValue;
    const nowEmpty = !val;

    if (prevEmpty !== nowEmpty) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onChange(e);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      const synthEvent = {
        ...e,
        target: { ...e.target, name: name || e.target.name, value: val }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      timerRef.current = setTimeout(() => {
        onChange(synthEvent);
      }, 35);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    isFocusedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    const synthEvent = {
      ...e,
      target: { ...e.target, name: name || e.target.name, value: localValue }
    } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(synthEvent);
    if (props.onBlur) props.onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    isFocusedRef.current = true;
    if (props.onFocus) props.onFocus(e);
  };

  return (
    <textarea
      name={name}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      className={className}
      {...props}
    />
  );
});
