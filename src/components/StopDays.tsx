function tripDayList(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (d <= last && out.length < 366) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Tap a day to set arrival, tap another to set departure. */
export function StopDays({ start, end, from, to, onChange }: {
  start: string; end: string; from: string | null; to: string | null; onChange: (a: string | null, l: string | null) => void;
}) {
  const days = tripDayList(start, end);
  function tap(day: string) {
    if (!from || to || day < from) onChange(day, null);
    else onChange(from, day);
  }
  const fmt = (iso: string) => new Date(iso + "T00:00:00Z");
  return (
    <div className="mt-2 pl-8">
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{!from ? "Tap the day you arrived" : !to ? "Now tap the day you left" : `${from} to ${to}`}</span>
        {from && <button type="button" className="underline" onClick={() => onChange(null, null)}>Clear</button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((day) => {
          const d = fmt(day);
          const edge = day === from || day === to;
          const inside = !!from && !!to && day > from && day < to;
          return (
            <button key={day} type="button" onClick={() => tap(day)} aria-pressed={edge || inside}
              aria-label={d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
              className={`flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-xl border text-xs transition-colors ${
                edge ? "border-primary bg-primary text-primary-foreground" : inside ? "border-primary/40 bg-primary/15" : "border-border hover:bg-accent"}`}>
              <span className="text-[10px] uppercase opacity-70">{d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}</span>
              <span className="text-sm font-bold">{d.getUTCDate()}</span>
              <span className="text-[10px] opacity-70">{d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
