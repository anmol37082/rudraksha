"use client";
import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { Button, EmptyState } from "./ui";
import styles from "./NotificationList.module.css";

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
      {items.some((n) => !n.isRead) && <div className={styles.actions}><Button small variant="outline" onClick={readAll}>Mark all as read</Button></div>}
      <ul className={styles.list}>
        {items.map((n) => (
          <li key={n._id} className={`${styles.item} ${n.isRead ? "" : styles.unread}`}>
            <div className={styles.copy}>
              <p className={styles.title}>{n.title}</p>
              <p className={styles.message}>{n.message}</p>
              <p className={styles.timestamp}>{fmtDate(n.createdAt)}</p>
            </div>
            {!n.isRead && <Button small variant="outline" className={styles.readButton} onClick={() => read(n._id)}>Mark read</Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
