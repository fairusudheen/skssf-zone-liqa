"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";

const MENU_MAX_HEIGHT = 340;

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m4 10 4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m4 7 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function CustomSelect({
  id,
  labelId,
  value,
  options,
  placeholder,
  menuLabel,
  onChange,
  onBlur,
  describedBy,
  invalid = false,
  disabled = false,
  required = true,
  triggerRef,
}: {
  id: string;
  labelId: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  menuLabel: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [listMaxHeight, setListMaxHeight] = useState(MENU_MAX_HEIGHT);

  const listboxId = `${id}-listbox`;

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (triggerRef) triggerRef.current = node;
    },
    [triggerRef],
  );

  const measureMenu = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;
    const openUp = spaceBelow < 300 && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;

    setPlacement(openUp ? "top" : "bottom");
    setListMaxHeight(
      Math.max(148, Math.min(MENU_MAX_HEIGHT, available - 40)),
    );
  }, []);

  function openMenu() {
    if (disabled) return;

    const selectedIndex = options.indexOf(value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    measureMenu();
    setOpen(true);
  }

  function closeMenu(returnFocus = false) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function selectOption(index: number) {
    const next = options[index];
    if (next === undefined) return;
    setOpen(false);
    onChange(next);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setActiveIndex((index) =>
            Math.min(index + 1, options.length - 1),
          );
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setActiveIndex((index) => Math.max(index - 1, 0));
        }
        break;

      case "Home":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(0);
        break;

      case "End":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;

      case "Enter":
      case " ":
        event.preventDefault();
        if (open) {
          selectOption(activeIndex);
        } else {
          openMenu();
        }
        break;

      case "Escape":
        if (open) {
          event.preventDefault();
          closeMenu(true);
        }
        break;

      case "Tab":
        if (open) setOpen(false);
        break;
    }
  }

  useEffect(() => {
    if (!open) return;

    function handleOutsidePointer(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleReposition() {
      measureMenu();
    }

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, measureMenu]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const option = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !option) return;

    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    if (optionTop < list.scrollTop) {
      list.scrollTop = optionTop;
    } else if (optionBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = optionBottom - list.clientHeight;
    }
  }, [activeIndex, open]);

  return (
    <div className="custom-select" ref={rootRef}>
      <button
        ref={setTriggerRef}
        className="custom-select-trigger"
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open ? `${id}-option-${activeIndex}` : undefined
        }
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && rootRef.current?.contains(next)) {
            return;
          }
          onBlur?.();
        }}
      >
        <span
          className={`custom-select-value${value ? "" : " is-placeholder"}`}
        >
          {value || placeholder}
        </span>
        <span
          className={`custom-select-indicator${
            value && !open ? " is-check" : ""
          }`}
          aria-hidden="true"
        >
          {value && !open ? <CheckIcon /> : <ChevronIcon />}
        </span>
      </button>

      {open && (
        <div
          className={`custom-select-menu${
            placement === "top" ? " is-top" : ""
          }`}
        >
          <div className="custom-select-head">
            <span>{menuLabel}</span>
            <span>{String(options.length).padStart(2, "0")}</span>
          </div>

          <div
            className="custom-select-list"
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            ref={listRef}
            style={{ maxHeight: `${listMaxHeight}px` }}
          >
            {options.map((option, index) => {
              const selected = option === value;
              const active = index === activeIndex;

              return (
                <button
                  className={[
                    "custom-select-option",
                    selected ? "is-selected" : "",
                    active ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  id={`${id}-option-${index}`}
                  key={option}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={selected}
                  onPointerDown={(event) => {
                    if (event.pointerType === "mouse") {
                      event.preventDefault();
                    }
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => selectOption(index)}
                >
                  <span className="custom-select-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="custom-select-label">{option}</span>
                  <span className="custom-select-check" aria-hidden="true">
                    {selected ? <CheckIcon /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
