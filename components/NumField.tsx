"use client";

import { useEffect, useState } from "react";

interface Props {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  full?: boolean;
}

/** 入力途中("1."や空欄)を許容する数値フィールド */
export default function NumField({ id, label, value, onChange, unit, min, max, step, help, full }: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (parseFloat(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          onBlur={() => {
            const v = parseFloat(text);
            if (!Number.isFinite(v)) {
              setText(String(value));
              return;
            }
            let c = v;
            if (min !== undefined) c = Math.max(min, c);
            if (max !== undefined) c = Math.min(max, c);
            setText(String(c));
            if (c !== v) onChange(c);
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {help && <span className="help">{help}</span>}
    </div>
  );
}
