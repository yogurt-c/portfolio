"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  onDone,
  duration = 1800,
}: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);
  return <div className="toast">{message}</div>;
}
