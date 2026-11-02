"use client";

/** Liste déroulante qui enregistre dès qu'on change la valeur. */
export function SelectAuto({ name, defaultValue, options, label }: {
  name: string; defaultValue: string; options: readonly { id: string; label: string }[]; label: string;
}) {
  return (
    <select
      aria-label={label}
      name={name}
      defaultValue={defaultValue}
      className="input py-1.5 text-sm"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
