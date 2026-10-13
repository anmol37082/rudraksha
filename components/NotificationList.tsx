"use client";
import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { Button, EmptyState } from "./ui";

export function NotificationList({ initial }: { initial: any[] }) {
  const [items, setItems] = useState(initial);
  async function read(id: string) {
    setItems((l) => l.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    await api(`/api/notifications/${id}/read`, "PUT");
  }
  async function readAll() {
    setItems((l) => l.map((n) => ({ ...n, isRead: true })));
    await api("/api/notifications", "PUT");
  }
  if (!items.length) return <EmptyState title="No notifications yet" text="Updates about your applications will show up here." />;
  return (
    <div>
      {items.some((n) => !n.isRead) && <div className="mb-3 text-right"><Button small variant="outline" onClick={readAll}>Mark all as read</Button></div>}
      <ul className="divide-y divide-forest-100 rounded-lg border border-forest-100 bg-white">
        {items.map((n) => (
          <li key={n._id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${n.isRead ? "" : "bg-gold-300/15"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-forest-900">{n.title}</p>
              <p className="text-sm text-stone-700">{n.message}</p>
              <p className="mt-1 text-xs text-stone-500">{fmtDate(n.createdAt)}</p>
            </div>
            {!n.isRead && <Button small variant="outline" className="self-start" onClick={() => read(n._id)}>Mark read</Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
