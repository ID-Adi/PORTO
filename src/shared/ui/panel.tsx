type PanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function Panel({ children, className }: PanelProps) {
  return <div className={["panel rounded-3xl", className].filter(Boolean).join(" ")}>{children}</div>;
}

