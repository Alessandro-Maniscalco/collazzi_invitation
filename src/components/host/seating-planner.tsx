"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import Link from "next/link";

import { normalizeGuestSearch } from "@/lib/check-in";
import {
  SEATS_PER_TABLE,
  guestAtSeat,
  sortSeatingGuests,
  type SeatingGuest,
  type SeatingMoveMode,
  type SeatingSnapshot,
} from "@/lib/seating";

import styles from "./seating-planner.module.css";

const REFRESH_INTERVAL_MS = 10_000;
const seatPositions = Array.from({ length: SEATS_PER_TABLE }, (_, index) => index + 1);
const leftSeatPositions = seatPositions.slice(0, 5);
const rightSeatPositions = seatPositions.slice(5).reverse();
const compactSeatPositions = leftSeatPositions.flatMap((position, index) => [
  position,
  rightSeatPositions[index],
]);

interface PendingDestination {
  guestId: string;
  tableId: number;
  seatPosition: number;
  occupant: SeatingGuest;
}

export function SeatingPlanner({ initialData }: { initialData: SeatingSnapshot }) {
  const [data, setData] = useState(initialData);
  const [selectedGuestId, setSelectedGuestId] = useState<string>();
  const [expandedTableId, setExpandedTableId] = useState<number>();
  const [pendingDestination, setPendingDestination] = useState<PendingDestination>();
  const [editingTableId, setEditingTableId] = useState<number>();
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [guestListOpen, setGuestListOpen] = useState(true);
  const mutationInFlight = useRef(false);

  const selectedGuest = data.guests.find((guest) => guest.id === selectedGuestId);
  const unseatedGuests = useMemo(
    () => sortSeatingGuests(data.guests.filter((guest) => !guest.tableId || !guest.seatPosition)),
    [data.guests],
  );
  const visibleUnseatedGuests = useMemo(() => {
    const query = normalizeGuestSearch(searchQuery);
    if (!query) return unseatedGuests;
    return unseatedGuests.filter((guest) =>
      normalizeGuestSearch(`${guest.firstName} ${guest.lastName}`).includes(query),
    );
  }, [searchQuery, unseatedGuests]);
  const checkIn = data.checkIn ?? {
    adults: {
      checkedIn: data.guests.filter((guest) => guest.checkedIn).length,
      total: data.guests.length,
    },
    others: { checkedIn: 0, total: 0 },
  };

  const refresh = useCallback(async () => {
    if (mutationInFlight.current || document.visibilityState !== "visible") return;
    const response = await fetch("/api/host/seating", { cache: "no-store" });
    if (!response.ok) return;
    setData((await response.json()) as SeatingSnapshot);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelectedGuestId(undefined);
      setPendingDestination(undefined);
      setEditingTableId(undefined);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function saveMove(
    guestId: string,
    targetTableId: number | undefined,
    targetSeatPosition: number | undefined,
    mode: SeatingMoveMode,
  ) {
    mutationInFlight.current = true;
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    const response = await fetch("/api/host/seating", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "move",
        guestId,
        targetTableId,
        targetSeatPosition,
        mode,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | SeatingSnapshot
      | { error?: string }
      | null;

    if (!response.ok || !payload || !("tables" in payload)) {
      setError((payload && "error" in payload && payload.error) || "Unable to save the move.");
    } else {
      setData(payload);
      setSelectedGuestId(undefined);
      setPendingDestination(undefined);
      setMessage("Seating change saved to Google Sheets.");
    }
    mutationInFlight.current = false;
    setSaving(false);
  }

  function chooseSeat(tableId: number, seatPosition: number, draggedGuestId?: string) {
    const guestId = draggedGuestId || selectedGuestId;
    const occupant = guestAtSeat(data.guests, tableId, seatPosition);

    if (!guestId) {
      if (occupant) setSelectedGuestId(occupant.id);
      return;
    }
    if (occupant?.id === guestId) {
      setSelectedGuestId(undefined);
      return;
    }
    if (occupant) {
      setPendingDestination({ guestId, tableId, seatPosition, occupant });
      return;
    }
    void saveMove(guestId, tableId, seatPosition, "move");
  }

  function startDrag(event: DragEvent, guestId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", guestId);
    setSelectedGuestId(guestId);
  }

  function dropOnSeat(event: DragEvent, tableId: number, seatPosition: number) {
    event.preventDefault();
    chooseSeat(tableId, seatPosition, event.dataTransfer.getData("text/plain"));
  }

  function dropOnGuestList(event: DragEvent) {
    event.preventDefault();
    const guestId = event.dataTransfer.getData("text/plain") || selectedGuestId;
    if (guestId) void saveMove(guestId, undefined, undefined, "move");
  }

  async function saveTableName(tableId: number) {
    const name = editingName.trim();
    const current = data.tables.find((table) => table.id === tableId);
    if (!name || name === current?.name) {
      setEditingTableId(undefined);
      return;
    }

    mutationInFlight.current = true;
    setSaving(true);
    setError(undefined);
    const response = await fetch("/api/host/seating", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", tableId, name }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { table?: { id: number; name: string }; error?: string }
      | null;
    if (!response.ok || !payload?.table) {
      setError(payload?.error ?? "Unable to rename the table.");
    } else {
      setData((currentData) => ({
        ...currentData,
        tables: currentData.tables.map((table) =>
          table.id === payload.table?.id ? payload.table : table,
        ),
      }));
      setMessage("Table name saved to Google Sheets.");
    }
    mutationInFlight.current = false;
    setSaving(false);
    setEditingTableId(undefined);
  }

  function beginEditing(tableId: number, name: string) {
    setEditingTableId(tableId);
    setEditingName(name);
  }

  function editingKeyDown(event: KeyboardEvent<HTMLInputElement>, tableId: number) {
    if (event.key === "Enter") void saveTableName(tableId);
    if (event.key === "Escape") setEditingTableId(undefined);
  }

  return (
    <main className={styles.planner} data-guest-list-open={guestListOpen}>
      <section className={styles.workspace}>
        <header className="sticky top-0 z-30 flex min-w-max items-center justify-between gap-5 border-b border-stone-300/70 bg-[#f4efe7]/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="flex items-end gap-5">
            <div>
              <div className="section-label">Diana guest list</div>
              <h1 className="mt-1 font-display text-4xl leading-none text-stone-950">Seating plan</h1>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">
                Check-in · Adults: {checkIn.adults.checkedIn}/{checkIn.adults.total} · Others: {checkIn.others.checkedIn}/{checkIn.others.total}
              </p>
            </div>
            <label className="block w-72">
              <span className="sr-only">Search unseated guests</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search guest name"
                className="w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[var(--app-wine)] focus:ring-4 focus:ring-[rgba(90,31,45,0.1)]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            {saving ? <span className="text-sm font-semibold text-stone-600">Saving…</span> : null}
            {selectedGuest ? (
              <button
                type="button"
                onClick={() => setSelectedGuestId(undefined)}
                className="rounded-full bg-[var(--app-wine)] px-4 py-2 text-sm font-bold text-white shadow-sm"
              >
                Deselect {selectedGuest.firstName}
              </button>
            ) : null}
            <Link
              href="/host"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-800"
            >
              Host page
            </Link>
          </div>
        </header>

        <div aria-live="polite" className="px-5 pt-4 sm:px-7">
          {message ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">{message}</div>
          ) : null}
          {error ? (
            <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-900">{error}</div>
          ) : null}
        </div>

        {expandedTableId ? (
          <ExpandedTable
            table={data.tables.find((table) => table.id === expandedTableId)!}
            guests={data.guests}
            selectedGuestId={selectedGuestId}
            editing={editingTableId === expandedTableId}
            editingName={editingName}
            onEditingNameChange={setEditingName}
            onEditingKeyDown={editingKeyDown}
            onBeginEditing={beginEditing}
            onSaveTableName={saveTableName}
            onSeatClick={chooseSeat}
            onDragStart={startDrag}
            onDropSeat={dropOnSeat}
            onClose={() => setExpandedTableId(undefined)}
          />
        ) : (
          <div className="p-5 sm:p-7">
            <div className={styles.tableGrid}>
              {data.tables.map((table) => (
                <CompactTable
                  key={table.id}
                  table={table}
                  guests={data.guests}
                  selectedGuestId={selectedGuestId}
                  editing={editingTableId === table.id}
                  editingName={editingName}
                  onEditingNameChange={setEditingName}
                  onEditingKeyDown={editingKeyDown}
                  onBeginEditing={beginEditing}
                  onSaveTableName={saveTableName}
                  onOpen={() => setExpandedTableId(table.id)}
                  onSeatClick={chooseSeat}
                  onDragStart={startDrag}
                  onDropSeat={dropOnSeat}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <button
        type="button"
        aria-controls="seating-guest-list"
        aria-expanded={guestListOpen}
        aria-label={guestListOpen ? "Hide guest list" : "Show guest list"}
        onClick={() => setGuestListOpen((open) => !open)}
        className={styles.sidebarToggle}
      >
        <span aria-hidden="true">{guestListOpen ? "→" : "←"}</span>
      </button>

      <aside
        id="seating-guest-list"
        className={styles.guestList}
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropOnGuestList}
      >
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-[#fffaf4]/95 px-4 py-5 backdrop-blur sm:px-5">
          <h2 className="font-display text-3xl text-stone-950">Unseated</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            {searchQuery.trim() ? `${visibleUnseatedGuests.length} of ` : ""}
            {unseatedGuests.length} guests · alphabetical
          </p>
        </div>
        <div className="space-y-2 p-3 sm:p-4">
          {visibleUnseatedGuests.map((guest) => (
            <GuestButton
              key={guest.id}
              guest={guest}
              selected={guest.id === selectedGuestId}
              compact={false}
              onClick={() => setSelectedGuestId(guest.id === selectedGuestId ? undefined : guest.id)}
              onDragStart={startDrag}
            />
          ))}
          {!unseatedGuests.length ? (
            <div className="rounded-2xl border border-dashed border-stone-300 px-3 py-8 text-center text-sm text-stone-500">
              Everyone is seated. Drop a guest here to unseat them.
            </div>
          ) : !visibleUnseatedGuests.length ? (
            <div className="rounded-2xl border border-dashed border-stone-300 px-3 py-8 text-center text-sm text-stone-500">
              No unseated guests match this search.
            </div>
          ) : null}
        </div>
      </aside>

      {pendingDestination ? (
        <SwitchDialog
          destination={pendingDestination}
          selected={data.guests.find((guest) => guest.id === pendingDestination.guestId)!}
          onCancel={() => setPendingDestination(undefined)}
          onChoose={(mode) =>
            void saveMove(
              pendingDestination.guestId,
              pendingDestination.tableId,
              pendingDestination.seatPosition,
              mode,
            )
          }
        />
      ) : null}
    </main>
  );
}

interface TableProps {
  table: SeatingSnapshot["tables"][number];
  guests: SeatingGuest[];
  selectedGuestId?: string;
  editing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onEditingKeyDown: (event: KeyboardEvent<HTMLInputElement>, tableId: number) => void;
  onBeginEditing: (tableId: number, name: string) => void;
  onSaveTableName: (tableId: number) => void;
  onSeatClick: (tableId: number, seatPosition: number, draggedGuestId?: string) => void;
  onDragStart: (event: DragEvent, guestId: string) => void;
  onDropSeat: (event: DragEvent, tableId: number, seatPosition: number) => void;
}

function CompactTable(props: TableProps & { onOpen: () => void }) {
  return (
    <article
      className={`${styles.compactTable} cursor-zoom-in rounded-[1.7rem] border border-stone-300 bg-white/80 p-3 shadow-[0_12px_30px_rgba(67,45,26,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_17px_34px_rgba(67,45,26,0.12)]`}
      onClick={props.onOpen}
    >
      <TableName {...props} />
      <div className={`${styles.compactSeats} mt-3`}>
        {compactSeatPositions.map((position) => (
          <Seat
            key={position}
            tableId={props.table.id}
            position={position}
            guest={guestAtSeat(props.guests, props.table.id, position)}
            selectedGuestId={props.selectedGuestId}
            compact
            onSeatClick={props.onSeatClick}
            onDragStart={props.onDragStart}
            onDropSeat={props.onDropSeat}
          />
        ))}
      </div>
    </article>
  );
}

function ExpandedTable(props: TableProps & { onClose: () => void }) {
  return (
    <div
      className={`${styles.expandedStage} flex min-w-max cursor-zoom-out items-center justify-center p-6`}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div className={styles.expandedLayout} onClick={(event) => event.stopPropagation()}>
        <div className={styles.tableSurface}>
          <TableName {...props} large />
        </div>
        {seatPositions.map((position) => (
          <div
            key={position}
            className={styles.expandedSeat}
            data-position={position}
          >
            <Seat
              tableId={props.table.id}
              position={position}
              guest={guestAtSeat(props.guests, props.table.id, position)}
              selectedGuestId={props.selectedGuestId}
              onSeatClick={props.onSeatClick}
              onDragStart={props.onDragStart}
              onDropSeat={props.onDropSeat}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableName(props: TableProps & { large?: boolean }) {
  if (props.editing) {
    return (
      <input
        autoFocus
        value={props.editingName}
        maxLength={80}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => props.onEditingNameChange(event.target.value)}
        onKeyDown={(event) => props.onEditingKeyDown(event, props.table.id)}
        onBlur={() => props.onSaveTableName(props.table.id)}
        className={`w-full rounded-xl border border-[var(--app-wine)] bg-white px-3 py-2 text-center font-bold outline-none ring-4 ring-[rgba(90,31,45,0.1)] ${props.large ? "text-2xl" : "text-sm"}`}
      />
    );
  }

  return (
    <button
      type="button"
      title="Double-click to edit the table name"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={() => props.onBeginEditing(props.table.id, props.table.name)}
      className={`block cursor-text truncate text-center font-bold text-stone-900 ${
        props.large ? "w-full text-3xl" : "mx-auto w-fit max-w-full text-sm"
      }`}
    >
      {props.table.name}
    </button>
  );
}

function Seat({
  tableId,
  position,
  guest,
  selectedGuestId,
  compact = false,
  onSeatClick,
  onDragStart,
  onDropSeat,
}: {
  tableId: number;
  position: number;
  guest?: SeatingGuest;
  selectedGuestId?: string;
  compact?: boolean;
  onSeatClick: TableProps["onSeatClick"];
  onDragStart: TableProps["onDragStart"];
  onDropSeat: TableProps["onDropSeat"];
}) {
  return (
    <button
      type="button"
      draggable={Boolean(guest)}
      title={guest ? `${guest.firstName} ${guest.lastName}`.trim() : `Empty seat ${position}`}
      onClick={(event) => {
        event.stopPropagation();
        onSeatClick(tableId, position);
      }}
      onDragStart={(event) => guest && onDragStart(event, guest.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.stopPropagation();
        onDropSeat(event, tableId, position);
      }}
      className={`flex min-w-0 items-center gap-1 rounded-xl border text-left transition ${
        compact ? "px-2 py-2 text-xs" : "px-3 py-3 text-sm"
      } ${
        guest && guest.id === selectedGuestId
          ? "border-[var(--app-wine)] bg-[#f6e8ed] ring-2 ring-[var(--app-wine)]"
          : guest?.checkedIn
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : guest
              ? "border-stone-300 bg-stone-100 text-stone-600"
              : "border-dashed border-stone-300 bg-white/60 text-stone-400 hover:border-[var(--app-wine)]"
      }`}
    >
      <span className="shrink-0 font-mono text-[0.68rem] font-bold opacity-60">{position}</span>
      {guest ? (
        <span className={styles.guestName}>
          {`${guest.firstName} ${guest.lastName}`.trim()}
        </span>
      ) : (
        <span className={styles.guestName}>Empty</span>
      )}
    </button>
  );
}

function GuestButton({
  guest,
  selected,
  compact,
  onClick,
  onDragStart,
}: {
  guest: SeatingGuest;
  selected: boolean;
  compact: boolean;
  onClick: () => void;
  onDragStart: (event: DragEvent, guestId: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={(event) => onDragStart(event, guest.id)}
      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
        selected
          ? "border-[var(--app-wine)] bg-[#f6e8ed] ring-2 ring-[var(--app-wine)]"
          : guest.checkedIn
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-stone-200 bg-stone-100 text-stone-600 hover:border-stone-400"
      } ${compact ? "text-xs" : "text-sm"}`}
    >
      <span className="block font-bold">{guest.firstName} {guest.lastName}</span>
    </button>
  );
}

function SwitchDialog({
  destination,
  selected,
  onCancel,
  onChoose,
}: {
  destination: PendingDestination;
  selected: SeatingGuest;
  onCancel: () => void;
  onChoose: (mode: "switch" | "drop") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm" onClick={onCancel}>
      <section className="w-full max-w-md rounded-[1.8rem] border border-stone-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="section-label">Seat already occupied</div>
        <h2 className="mt-3 font-display text-4xl text-stone-950">Switch or drop?</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Move <strong>{selected.firstName} {selected.lastName}</strong> to seat {destination.seatPosition} and decide what happens to <strong>{destination.occupant.firstName} {destination.occupant.lastName}</strong>.
        </p>
        <div className="mt-6 grid gap-3">
          <button type="button" onClick={() => onChoose("switch")} className="rounded-full bg-[var(--app-wine)] px-5 py-3 font-bold text-white">
            Switch guests
          </button>
          <button type="button" onClick={() => onChoose("drop")} className="rounded-full border border-stone-300 bg-white px-5 py-3 font-bold text-stone-800">
            Move here and drop other guest to list
          </button>
          <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-bold text-stone-500">Cancel</button>
        </div>
      </section>
    </div>
  );
}
