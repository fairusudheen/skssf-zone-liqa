"use client";

import { useEffect, useRef } from "react";

export default function HeroTitle() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const title = ref.current;
    if (!title) return;

    function fitTitle() {
      if (!title) return;
      title.style.fontSize = "";
      const available = title.parentElement?.clientWidth || 0;
      const currentWidth = title.getBoundingClientRect().width;
      if (!available || !currentWidth) return;
      const computedSize = parseFloat(getComputedStyle(title).fontSize);
      const fitted = Math.floor(computedSize * (available / currentWidth));
      title.style.fontSize = `${Math.max(72, fitted)}px`;
    }

    const frame = requestAnimationFrame(fitTitle);
    if (document.fonts?.ready) document.fonts.ready.then(fitTitle);

    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(fitTitle);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <h1 id="event-title" className="hero-title" ref={ref}>
      ലിഖാഅ്
    </h1>
  );
}
