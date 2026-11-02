"use client";

import type { FormEvent } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";

export type ActionDialogField = {
  name: string;
  label: string;
  type?: "text" | "number" | "email";
  required?: boolean;
  defaultValue?: string;
  min?: number;
  max?: number;
  step?: number;
  multiline?: boolean;
};

export function ActionDialog({
  title,
  description,
  fields,
  submitLabel = "Save",
  busy = false,
  onCancel,
  onSubmit,
}: {
  title: string;
  description?: string;
  fields: ActionDialogField[];
  submitLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    onSubmit(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-forest-900/50 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <h2 id="action-dialog-title" className="font-serif text-xl">{title}</h2>
        {description && <p className="mt-2 text-sm text-stone-600">{description}</p>}
        <form className="mt-4 space-y-4" onSubmit={submit}>
          {fields.map((field) => (
            <Field key={field.name} label={field.label}>
              {field.multiline
                ? <Textarea name={field.name} required={field.required} defaultValue={field.defaultValue} />
                : <Input name={field.name} type={field.type ?? "text"} required={field.required} defaultValue={field.defaultValue} min={field.min} max={field.max} step={field.step} />}
            </Field>
          ))}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
