"use client";
import { forwardRef } from "react";
import ReactMarkdown from "react-markdown";

type Props = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Forwarded to the inner textarea so FormControl label association works. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/** Editor markdown + preview lado-a-lado. Controlado (value/onChange). Extraído do wizard/kb. */
export const KbMarkdownField = forwardRef<HTMLTextAreaElement, Props>(function KbMarkdownField(
  { value, onChange, disabled, placeholder, id, "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid },
  ref,
) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <textarea
        ref={ref}
        id={id}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={12}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div
        aria-label="Preview da KB"
        data-testid="kb-preview"
        className="hidden min-h-[180px] w-full rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 text-sm md:block"
      >
        {value.trim().length > 0 ? (
          <div className="prose prose-sm max-w-none break-words [&>h1]:mt-0 [&>h1]:text-base [&>h1]:font-semibold [&>h2]:text-sm [&>h2]:font-semibold [&>ul]:list-disc [&>ul]:pl-5">
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        ) : (
          <span className="text-muted-foreground">Preview aparece aqui — use markdown.</span>
        )}
      </div>
    </div>
  );
});
