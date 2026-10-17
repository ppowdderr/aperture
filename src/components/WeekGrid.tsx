"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { BlockKind, Preferences, TimeBlock } from "@/lib/types";

export const DAY_START = 8 * 60;
export const DAY_END = 18 * 60;
const SPAN = DAY_END - DAY_START;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const KINDS: { kind: BlockKind; label: string; hint: string }[] = [
  { kind: "free", label: "Keep free", hint: "No classes" },
  { kind: "avoid", label: "Avoid", hint: "Only if nothing else fits" },
  { kind: "prefer", label: "Prefer", hint: "Classes here if possible" },
];
const KIND_LABEL: Record<BlockKind, string> = { free: "Free", avoid: "Avoid", prefer: "Prefer" };

type Day = TimeBlock["day"];

export function emptyPreferences(): Preferences {
  return { blocks: [], maxBackToBackHours: 4, maxGapHours: 3, campusDaysTogether: false, wantKeywords: [], pinned: [], excluded: [] };
}

let seq = 0;
const newId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`;

export const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const snapHour = (m: number) => clamp(Math.round(m / 60) * 60, DAY_START, DAY_END);

/** Insert `block`, trimming or splitting anything it overlaps on the same day. Pure. */
export function placeBlock(blocks: TimeBlock[], block: TimeBlock): TimeBlock[] {
  const out: TimeBlock[] = [];
  for (const b of blocks) {
    if (b.id === block.id) continue;
    if (b.day !== block.day || b.end <= block.start || b.start >= block.end) {
      out.push(b);
      continue;
    }
    if (b.start < block.start) out.push({ ...b, end: block.start });
    if (b.end > block.end) out.push({ ...b, id: b.start < block.start ? newId() : b.id, start: block.end });
  }
  out.push(block);
  return out.sort((a, b) => a.day - b.day || a.start - b.start);
}

interface WeekGridProps {
  value: Preferences;
  onChange: (next: Preferences) => void;
}

type Drag =
  | { mode: "create"; day: Day; anchor: number; end: number }
  | { mode: "move"; id: string; origin: TimeBlock; day: Day; start: number; moved: boolean }
  | { mode: "resize"; id: string; origin: TimeBlock; edge: "start" | "end"; moved: boolean };

export function WeekGrid({ value, onChange }: WeekGridProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [preview, setPreview] = useState<TimeBlock[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [caret, setCaret] = useState<{ day: Day; hour: number } | null>(null);
  const [canvasFocused, setCanvasFocused] = useState(false);
  const history = useRef<TimeBlock[][]>([]);
  const pendingFocus = useRef<string | null>(null);
  const hintId = useId();

  const blocks = preview ?? value.blocks;

  const commit = useCallback(
    (next: TimeBlock[]) => {
      history.current.push(value.blocks);
      if (history.current.length > 50) history.current.shift();
      onChange({ ...value, blocks: next });
    },
    [value, onChange],
  );

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev) onChange({ ...value, blocks: prev });
  }, [value, onChange]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = canvasRef.current?.querySelector<HTMLElement>(`[data-block="${pendingFocus.current}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [value.blocks]);

  const locate = useCallback((e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const day = clamp(Math.floor(((e.clientX - rect.left) / rect.width) * 5), 0, 4) as Day;
    const minutes = snapHour(((e.clientY - rect.top) / rect.height) * SPAN + DAY_START);
    return { day, minutes };
  }, []);

  // Drag lifecycle on window so leaving the canvas never strands a drag (and jsdom needs no pointer capture).
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: globalThis.PointerEvent) => {
      const { day, minutes } = locate(e);
      if (drag.mode === "create") {
        setDrag({ ...drag, end: minutes });
      } else if (drag.mode === "move") {
        const len = drag.origin.end - drag.origin.start;
        const start = clamp(minutes - (drag.start - drag.origin.start), DAY_START, DAY_END - len);
        const moved = drag.moved || day !== drag.origin.day || start !== drag.origin.start;
        setDrag({ ...drag, moved });
        setPreview(placeBlock(value.blocks, { ...drag.origin, day, start, end: start + len }));
      } else {
        const b = drag.origin;
        const next =
          drag.edge === "start"
            ? { ...b, start: clamp(minutes, DAY_START, b.end - 60) }
            : { ...b, end: clamp(minutes, b.start + 60, DAY_END) };
        setDrag({ ...drag, moved: true });
        setPreview(placeBlock(value.blocks, next));
      }
    };
    const onUp = () => {
      if (drag.mode === "create") {
        const [s, e] = drag.anchor <= drag.end ? [drag.anchor, drag.end] : [drag.end, drag.anchor];
        const end = e === s ? Math.min(s + 60, DAY_END) : e;
        const start = end === s ? s - 60 : s;
        const block: TimeBlock = { id: newId(), day: drag.day, start, end, kind: "free" };
        pendingFocus.current = block.id;
        commit(placeBlock(value.blocks, block));
      } else if (preview && drag.moved) {
        commit(preview);
      } else if (!drag.moved) {
        setOpenId((cur) => (cur === drag.id ? null : drag.id));
      }
      setPreview(null);
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, preview, value.blocks, locate, commit]);

  const onCanvasPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    e.preventDefault();
    setOpenId(null);
    const { day, minutes } = locate(e);
    setDrag({ mode: "create", day, anchor: minutes, end: minutes });
  };

  const onBlockPointerDown = (b: TimeBlock) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const edge = (e.target as HTMLElement).dataset.edge as "start" | "end" | undefined;
    if (edge) {
      setDrag({ mode: "resize", id: b.id, origin: b, edge, moved: false });
    } else {
      const { minutes } = locate(e);
      setDrag({ mode: "move", id: b.id, origin: b, day: b.day, start: minutes, moved: false });
    }
  };

  const update = (b: TimeBlock) => commit(placeBlock(value.blocks, b));
  const remove = (id: string) => {
    setOpenId(null);
    commit(value.blocks.filter((b) => b.id !== id));
  };
  const setKind = (id: string, kind: BlockKind) => {
    const b = value.blocks.find((x) => x.id === id);
    if (b) commit(value.blocks.map((x) => (x.id === id ? { ...x, kind } : x)));
    setOpenId(null);
    pendingFocus.current = id;
  };

  const onRootKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    } else if (e.key === "Escape" && openId) {
      e.preventDefault();
      pendingFocus.current = openId;
      setOpenId(null);
      canvasRef.current?.querySelector<HTMLElement>(`[data-block="${openId}"]`)?.focus();
    }
  };

  const onCanvasKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const c = caret ?? { day: 0 as Day, hour: 9 };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dd, dh] = moves[e.key];
      setCaret({ day: clamp(c.day + dd, 0, 4) as Day, hour: clamp(c.hour + dh, DAY_START / 60, DAY_END / 60 - 1) });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const block: TimeBlock = { id: newId(), day: c.day, start: c.hour * 60, end: c.hour * 60 + 60, kind: "free" };
      pendingFocus.current = block.id;
      commit(placeBlock(value.blocks, block));
    }
  };

  const onBlockKeyDown = (b: TimeBlock) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const act = (next: TimeBlock) => {
      e.preventDefault();
      pendingFocus.current = b.id;
      update(next);
    };
    switch (e.key) {
      case "ArrowUp":
        if (e.shiftKey) return b.end - 60 > b.start ? act({ ...b, end: b.end - 60 }) : e.preventDefault();
        return b.start > DAY_START ? act({ ...b, start: b.start - 60, end: b.end - 60 }) : e.preventDefault();
      case "ArrowDown":
        if (e.shiftKey) return b.end < DAY_END ? act({ ...b, end: b.end + 60 }) : e.preventDefault();
        return b.end < DAY_END ? act({ ...b, start: b.start + 60, end: b.end + 60 }) : e.preventDefault();
      case "ArrowLeft":
        return b.day > 0 ? act({ ...b, day: (b.day - 1) as Day }) : e.preventDefault();
      case "ArrowRight":
        return b.day < 4 ? act({ ...b, day: (b.day + 1) as Day }) : e.preventDefault();
      case "Enter":
      case " ":
        e.preventDefault();
        return setOpenId((cur) => (cur === b.id ? null : b.id));
      case "Delete":
      case "Backspace":
        e.preventDefault();
        canvasRef.current?.focus();
        return remove(b.id);
    }
  };

  const draft =
    drag?.mode === "create"
      ? (() => {
          const [s, e] = drag.anchor <= drag.end ? [drag.anchor, drag.end] : [drag.end, drag.anchor];
          return { day: drag.day, start: s, end: e === s ? s + 60 : e };
        })()
      : null;

  const hours = Array.from({ length: SPAN / 60 }, (_, i) => DAY_START / 60 + i);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4" onKeyDown={onRootKeyDown}>
      <p id={hintId} className="sr-only">
        Drag on the grid to mark time you want kept free. Arrow keys move, Enter marks an hour, Delete removes a block, Enter on a
        block changes its type.
      </p>
      <div className="grid min-h-[280px] flex-1 grid-cols-[2.5rem_1fr] grid-rows-[1.25rem_1fr] gap-x-2 gap-y-1 text-[11px] text-fg-faint select-none">
        <div />
        <div className="grid grid-cols-5" aria-hidden>
          {DAYS.map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="relative font-mono" aria-hidden>
          {hours.map((h) => (
            <div key={h} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${((h * 60 - DAY_START) / SPAN) * 100}%` }}>
              {String(h).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div
          ref={canvasRef}
          role="group"
          aria-label="Week"
          aria-describedby={hintId}
          tabIndex={0}
          onFocus={(e) => e.target === e.currentTarget && setCanvasFocused(true)}
          onBlur={(e) => e.target === e.currentTarget && setCanvasFocused(false)}
          onPointerDown={onCanvasPointerDown}
          onKeyDown={onCanvasKeyDown}
          className="relative cursor-crosshair rounded-md border border-line bg-panel-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
            backgroundSize: `20% 100%, 100% ${100 / (SPAN / 60)}%`,
            backgroundPosition: "-1px 0, 0 -1px",
          }}
        >
          {canvasFocused && caret && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-sm ring-2 ring-accent ring-inset"
              style={cellStyle(caret.day, caret.hour * 60, caret.hour * 60 + 60)}
            />
          )}
          {draft && (
            <div aria-hidden className="pointer-events-none absolute rounded-[5px] border border-dashed border-fg-muted bg-panel" style={cellStyle(draft.day, draft.start, draft.end)}>
              <span className="absolute inset-x-2 top-1 text-fg-muted">{fmt(draft.start)}–{fmt(draft.end)}</span>
            </div>
          )}
          {blocks.map((b) => (
            <Block
              key={b.id}
              block={b}
              open={openId === b.id}
              onPointerDown={onBlockPointerDown(b)}
              onKeyDown={onBlockKeyDown(b)}
              onKind={(k) => setKind(b.id, k)}
              onRemove={() => remove(b.id)}
            />
          ))}
        </div>
      </div>
      <Controls value={value} onChange={onChange} />
    </div>
  );
}

function cellStyle(day: number, start: number, end: number) {
  return {
    left: `calc(${day * 20}% + 2px)`,
    width: "calc(20% - 4px)",
    top: `calc(${((start - DAY_START) / SPAN) * 100}% + 2px)`,
    height: `calc(${((end - start) / SPAN) * 100}% - 4px)`,
  };
}

const KIND_CLASS: Record<BlockKind, string> = {
  free: "border-line-strong bg-panel text-fg",
  avoid: "border-dashed border-fg-faint bg-panel text-fg-muted",
  prefer: "border-accent/60 bg-accent-dim/60 text-fg",
};

function Block({
  block: b,
  open,
  onPointerDown,
  onKeyDown,
  onKind,
  onRemove,
}: {
  block: TimeBlock;
  open: boolean;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onKind: (k: BlockKind) => void;
  onRemove: () => void;
}) {
  const label = `${KINDS.find((k) => k.kind === b.kind)!.label}, ${DAY_NAMES[b.day]} ${fmt(b.start)} to ${fmt(b.end)}`;
  const tall = b.end - b.start >= 120;
  return (
    <>
      <button
        type="button"
        data-block={b.id}
        aria-label={label}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className={`absolute cursor-grab overflow-hidden rounded-[5px] border px-2 py-1 text-left text-[12px] leading-tight active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${KIND_CLASS[b.kind]}`}
        style={cellStyle(b.day, b.start, b.end)}
      >
        <span className="font-medium">{KIND_LABEL[b.kind]}</span>
        {tall && <span className="block font-mono text-[11px] opacity-70">{fmt(b.start)}–{fmt(b.end)}</span>}
        <span data-edge="start" className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize" />
        <span data-edge="end" className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize" />
      </button>
      {open && <Popover block={b} onKind={onKind} onRemove={onRemove} />}
    </>
  );
}

function Popover({ block: b, onKind, onRemove }: { block: TimeBlock; onKind: (k: BlockKind) => void; onRemove: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-checked='true']")?.focus({ preventScroll: true });
  }, []);
  const below = b.end <= DAY_END - 180;
  const left = b.day >= 3;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${DAY_NAMES[b.day]} ${fmt(b.start)}–${fmt(b.end)}`}
      className="absolute z-10 w-60 rounded-lg border border-line-strong bg-panel p-1 text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      style={{
        left: left ? undefined : `calc(${b.day * 20}% + 2px)`,
        right: left ? `calc(${(4 - b.day) * 20}% + 2px)` : undefined,
        top: below ? `calc(${((b.end - DAY_START) / SPAN) * 100}% + 4px)` : undefined,
        bottom: below ? undefined : `calc(${((DAY_END - b.start) / SPAN) * 100}% + 4px)`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div role="radiogroup" aria-label="Block type" className="flex flex-col">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            role="radio"
            aria-checked={b.kind === k.kind}
            onClick={() => onKind(k.kind)}
            className="flex items-baseline justify-between gap-3 rounded-md px-2.5 py-1.5 text-left hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none aria-checked:text-accent"
          >
            <span>{k.label}</span>
            <span className="whitespace-nowrap text-[11px] text-fg-faint">{k.hint}</span>
          </button>
        ))}
      </div>
      <div className="mx-1 my-1 border-t border-line" />
      <button type="button" onClick={onRemove} className="w-full rounded-md px-2.5 py-1.5 text-left text-fg-muted hover:bg-panel-2 hover:text-fg focus-visible:bg-panel-2 focus-visible:outline-none">
        Remove
      </button>
    </div>
  );
}

function Controls({ value, onChange }: WeekGridProps) {
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-[13px]">
      <Num label="Max hours back-to-back" value={value.maxBackToBackHours} min={1} max={10} onChange={(v) => set("maxBackToBackHours", v)} />
      <Num label="Longest gap (hours)" value={value.maxGapHours} min={0} max={9} onChange={(v) => set("maxGapHours", v)} />
      <label className="flex h-8 cursor-pointer items-center gap-2 text-fg">
        <input
          type="checkbox"
          checked={value.campusDaysTogether}
          onChange={(e) => set("campusDaysTogether", e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Keep each campus to its own days
      </label>
    </div>
  );
}

function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[12px] text-fg-faint">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        className="h-8 w-20 rounded-md border border-line bg-panel-2 px-2 font-mono text-fg tabular-nums"
      />
    </div>
  );
}

/** Owns its own state until #19 wires the page. */
export function WeekGridStandalone({ children }: { children?: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(emptyPreferences);
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <WeekGrid value={prefs} onChange={setPrefs} />
      {children}
    </div>
  );
}
