import { useEffect, useMemo, useState } from "react";
import { formatInr, statusLabel } from "./money.js";

async function getJson(path) {
  const res = await fetch(path);
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error || "request failed"), { body, status: res.status });
  return body;
}

function slotCopy(iso) {
  const when = new Date(iso);
  const deltaH = (when.getTime() - Date.now()) / 36e5;
  const time = when.toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  if (deltaH < 0) return `${time} · already passed`;
  if (deltaH < 1) return `${time} · ${Math.round(deltaH * 60)} min`;
  return `${time} · ${deltaH.toFixed(1)} h`;
}

export function App() {
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [b, e] = await Promise.all([getJson("/api/bookings"), getJson("/api/events")]);
    setBookings(b.bookings);
    setEvents(e.events);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  const selected = useMemo(
    () => bookings.find((b) => b.id === active) || null,
    [bookings, active],
  );

  async function openCancel(id) {
    setError("");
    setActive(id);
    const data = await getJson(`/api/bookings/${id}/cancel-preview`);
    setPreview(data.decision);
  }

  async function confirmCancel() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${selected.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "customer demo cancel" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error === "NOT_CANCELLABLE" ? "This job cannot be cancelled." : body.error);
      }
      await refresh();
      if (res.ok) {
        setPreview({ allowed: false, code: "CANCELLED", feePaise: body.decision.feePaise });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bay">
      <header className="mast">
        <p className="eyebrow">GG-2 · feature/GG-2-booking-cancellation</p>
        <h1>Job cards</h1>
        <p className="lede">
          Cancel from the customer job card. Policy is shared: pending always free, confirmed inside 2 hours takes 50%,
          en route and completed stay locked.
        </p>
      </header>

      <div className="layout">
        <section className="board">
          {bookings.map((b) => (
            <article key={b.id} className={`card status-${b.status}`} onClick={() => openCancel(b.id)}>
              <div className="stripe" aria-hidden="true" />
              <div className="card-body">
                <div className="card-top">
                  <span className="mono">{b.id}</span>
                  <span className={`stamp stamp-${b.status}`}>{statusLabel(b.status)}</span>
                </div>
                <h2>{b.service}</h2>
                <p className="meta">{b.customer} · {b.garage}</p>
                <p className="meta">{slotCopy(b.slotStart)}</p>
                <p className="amount">{formatInr(b.amountPaise)}</p>
                {b.status === "cancelled" && (
                  <p className="void">VOID · fee {formatInr(b.cancellationFeePaise)} · refund {formatInr(b.refundPaise)}</p>
                )}
              </div>
              <aside className="stub">
                <span>STUB</span>
                <strong>{b.id.slice(-4)}</strong>
              </aside>
            </article>
          ))}
        </section>

        <aside className="dock">
          <h2>Cancel preview</h2>
          {!selected && <p>Pick a job card. BK-1001 → BK-1005 is the live AC walkthrough.</p>}
          {selected && (
            <>
              <p className="mono">{selected.id}</p>
              <p>{selected.service}</p>
              {preview?.allowed && preview.feePaise > 0 && (
                <p className="warn">Late cutoff. 50% fee {formatInr(preview.feePaise)} will be kept.</p>
              )}
              {preview?.allowed && preview.feePaise === 0 && (
                <p className="ok">No cancellation fee. Slot will be released.</p>
              )}
              {preview && !preview.allowed && selected.status !== "cancelled" && (
                <p className="blocked">Not cancellable in this status. Technician / job already in motion or closed.</p>
              )}
              <button
                type="button"
                disabled={busy || !preview?.allowed}
                onClick={confirmCancel}
              >
                {busy ? "Cancelling…" : "Confirm cancel"}
              </button>
            </>
          )}
          {error && <p className="blocked">{error}</p>}

          <h2>Notification log</h2>
          {events.length === 0 && <p>No garage / technician events yet.</p>}
          <ul>
            {events.map((e, i) => (
              <li key={`${e.bookingId}-${i}`}>
                <span className="mono">{e.bookingId}</span> → {e.audience}
                {e.garage ? ` · ${e.garage}` : ""}
                {e.technician ? ` · ${e.technician}` : ""}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
