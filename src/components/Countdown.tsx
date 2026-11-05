"use client";

import { useEffect, useState } from "react";
import { EVENT } from "@/lib/constants";

function pad(value: number, length: number) {
  return String(value).padStart(length, "0");
}

export default function Countdown() {
  const [time, setTime] = useState({
    days: "000",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  useEffect(() => {
    function update() {
      const distance = Math.max(0, EVENT.timestamp - Date.now());
      setTime({
        days: pad(Math.floor(distance / 86400000), 3),
        hours: pad(Math.floor(distance / 3600000) % 24, 2),
        minutes: pad(Math.floor(distance / 60000) % 60, 2),
        seconds: pad(Math.floor(distance / 1000) % 60, 2),
      });
    }
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="countdown"
      role="timer"
      aria-live="off"
      aria-label="പരിപാടിയിലേക്കുള്ള കൗണ്ട്ഡൗൺ"
    >
      <div className="count-unit">
        <span className="count-value">{time.days}</span>
        <span className="count-label">ദിവസം</span>
      </div>
      <div className="count-unit">
        <span className="count-value">{time.hours}</span>
        <span className="count-label">മണിക്കൂർ</span>
      </div>
      <div className="count-unit">
        <span className="count-value">{time.minutes}</span>
        <span className="count-label">മിനിറ്റ്</span>
      </div>
      <div className="count-unit">
        <span className="count-value">{time.seconds}</span>
        <span className="count-label">സെക്കൻഡ്</span>
      </div>
    </div>
  );
}
