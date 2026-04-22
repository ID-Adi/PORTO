"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setIsCopied(false);
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isCopied]);

  const handleClick = async () => {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="border-none hover:bg-transparent"
      onClick={() => void handleClick()}
      aria-label={`Copy ${label ?? value}`}
    >
      {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
