import React, { useState, useEffect } from 'react';

export const ComboboxField = ({ label, value, onChange, options, placeholder, isNumber = false, required = false, disabled = false, colSpan = 1 }: any) => {
  const [isCustom, setIsCustom] = useState(false);
  const matched = options.includes(isNumber ? Number(value) : value);
  const isActuallyCustom = value !== '' && value !== 0 && !matched && value !== undefined && value !== null;

  useEffect(() => {
    if (isActuallyCustom) setIsCustom(true);
  }, [isActuallyCustom]);

  return (
    <div className={`space-y-1.5 ${colSpan === 2 ? 'col-span-2' : ''}`}>
      <label className="text-xs font-bold text-slate-600 uppercase">{label}</label>
      {!isCustom && !isActuallyCustom ? (
        <select
          value={matched ? value : ''}
          onChange={(e) => {
            if (e.target.value === '___OTRO___') {
              setIsCustom(true);
              onChange(isNumber ? 0 : '');
            } else {
              onChange(isNumber ? Number(e.target.value) : e.target.value);
            }
          }}
          disabled={disabled}
          required={required && !disabled}
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 disabled:opacity-50 disabled:bg-slate-100"
        >
          <option value="">Seleccione...</option>
          {options.map((opt: any) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="___OTRO___">Otro (escribir...)</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input
            type={isNumber ? "number" : "text"}
            step={isNumber ? "0.01" : undefined}
            value={value}
            onChange={(e) => onChange(isNumber ? parseFloat(e.target.value) || 0 : e.target.value)}
            disabled={disabled}
            required={required && !disabled}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-lg focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 disabled:opacity-50 disabled:bg-slate-100"
            placeholder={placeholder}
            autoFocus
          />
          <button
            type="button"
            onClick={() => { setIsCustom(false); onChange(isNumber ? 0 : ''); }}
            className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
