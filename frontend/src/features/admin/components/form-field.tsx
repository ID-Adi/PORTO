import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-(--muted-foreground)">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-(--destructive)">{error}</p> : null}
    </div>
  );
}

export function TextField(
  props: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
    error?: string;
  },
) {
  const { label, hint, error, id, ...rest } = props;
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      <Input id={inputId} {...rest} />
    </Field>
  );
}

export function TextAreaField(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
    hint?: string;
    error?: string;
  },
) {
  const { label, hint, error, id, ...rest } = props;
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      <Textarea id={inputId} {...rest} />
    </Field>
  );
}
