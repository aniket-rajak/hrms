"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PasswordReveal({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="font-mono text-sm">{value ? (show ? value : "••••••••") : "—"}</span>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      ) : null}
    </span>
  );
}