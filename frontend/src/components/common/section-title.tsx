type SectionTitleProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionTitle({
  eyebrow,
  title,
  description,
}: SectionTitleProps) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow text-xs text-(--muted-foreground)">{eyebrow}</p>
      <h2 className="mt-3 text-xl font-medium tracking-[-0.04em] text-balance md:text-2xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-(--muted-foreground) md:text-base">
        {description}
      </p>
    </div>
  );
}

