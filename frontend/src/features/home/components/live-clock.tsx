"use client";

import { useEffect, useState } from "react";

function getCurrentTime(timeZone: string) {
  return new Date().toLocaleTimeString("id-ID", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function LiveClock({
  timeZone = "Asia/Makassar",
  label = "WITA",
}: {
  timeZone?: string;
  label?: string;
}) {
  const [time, setTime] = useState(() => getCurrentTime(timeZone));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(getCurrentTime(timeZone));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [timeZone]);

  return (
    <span className="text-(--foreground)">
      {label ? `${time} // ${label}` : time}
    </span>
  );
}
