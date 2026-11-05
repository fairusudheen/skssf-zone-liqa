"use client";

import { useEffect } from "react";

export default function MotionController() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    if (!("IntersectionObserver" in window) || reduced.matches) {
      items.forEach((item) => item.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
      );
      items.forEach((item) => observer.observe(item));

      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>("[data-magnetic]"),
    );

    const cleanups = buttons.map((button) => {
      const onMove = (event: PointerEvent) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.1;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.14;
        button.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      };
      const onLeave = () => {
        button.style.transform = "";
      };
      button.addEventListener("pointermove", onMove);
      button.addEventListener("pointerleave", onLeave);
      return () => {
        button.removeEventListener("pointermove", onMove);
        button.removeEventListener("pointerleave", onLeave);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
