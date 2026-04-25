"use client";

import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { useEffect, useState } from "react";

type LocalTimeProps = {
  timeZone?: string;
  label?: string;
};

export function LocalTime({
  timeZone = "Asia/Makassar",
  label = "WITA",
}: LocalTimeProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(format(TZDate.tz(timeZone), "HH:mm"));
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, [timeZone]);

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="text-(--foreground)">{`${time || "--:--"} // GMT+8`}</span>
      <span className="text-[11px] tracking-[0.14em] text-(--muted-foreground) uppercase">
        {label}
      </span>
    </span>
  );
}
