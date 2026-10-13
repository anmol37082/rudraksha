"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export function LogoutButton({ to = "/" , className = "" }: { to?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await api("/api/auth/logout", "POST");
    if (!result.success) {
      setBusy(false);
      setError(result.message || "Could not log out. Please try again.");
      return;
    }
    // Load the destination again after the server clears the HttpOnly cookie.
    window.location.replace(to);
  }

  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={logout}>
        {busy ? "Logging out…" : "Log out"}
      </button>
      {error && <p role="alert" className="px-3 py-2 text-xs text-rose-200">{error}</p>}
    </>
  );
}
