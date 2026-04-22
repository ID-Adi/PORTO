"use client";

import { useEffect, useState } from "react";

function getCurrentMakassarTime() {
  return new Date().toLocaleTimeString("id-ID", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function LiveClock() {
  const [time, setTime] = useState(getCurrentMakassarTime);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTime(getCurrentMakassarTime());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return <span className="text-(--foreground)">{`${time} // WITA`}</span>;
}
