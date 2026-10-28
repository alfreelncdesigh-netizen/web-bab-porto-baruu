import React, { useState, useEffect, useRef, useLayoutEffect, forwardRef } from 'react';

export interface FastInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FastInput = React.memo(forwardRef<HTMLInputElement, FastInputProps>(({ 
  value, 
  onChange, 
  name, 
  className, 
  type = "text", 
  ...props 
}, ref) => {
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
      // 30ms micro-debounce prevents mobile UI thread blocking and eliminates typing lag
      if (timerRef.current) clearTimeout(timerRef.current);
      const synthEvent = {
        ...e,
        target: { ...e.target, name: name || e.target.name, value: val }
      } as React.ChangeEvent<HTMLInputElement>;
      timerRef.current = setTimeout(() => {
        onChange(synthEvent);
      }, 30);
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
      ref={ref}
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
}));

export interface FastTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  autoResize?: boolean;
  minHeight?: number;
}

export const FastTextarea = React.memo(forwardRef<HTMLTextAreaElement, FastTextareaProps>(({ 
  value, 
  onChange, 
  name, 
  className, 
  autoResize = true,
  minHeight = 44,
  ...props 
}, forwardedRef) => {
  const [localValue, setLocalValue] = useState(value ?? '');
  const timerRef = useRef<any>(null);
  const isFocusedRef = useRef(false);
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    internalRef.current = el;
    if (typeof forwardedRef === 'function') {
      forwardedRef(el);
    } else if (forwardedRef) {
      (forwardedRef as any).current = el;
    }
  };

  const adjustHeight = () => {
    if (!autoResize || !internalRef.current) return;
    const el = internalRef.current;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    const targetH = Math.max(minHeight, scrollH);
    el.style.height = `${targetH}px`;
  };

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    adjustHeight();

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
      }, 30);
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
    adjustHeight();
    if (props.onBlur) props.onBlur(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    isFocusedRef.current = true;
    adjustHeight();
    if (props.onFocus) props.onFocus(e);
  };

  return (
    <textarea
      ref={setRefs}
      name={name}
      value={localValue}
      onChange={handleChange}
      onInput={adjustHeight}
      onFocus={handleFocus}
      onBlur={handleBlur}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      className={`${className || ''} ${autoResize ? 'resize-none overflow-hidden' : ''}`}
      {...props}
    />
  );
}));
