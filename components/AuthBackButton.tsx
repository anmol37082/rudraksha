"use client";

import { useRouter } from "next/navigation";

export function AuthBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="auth-back"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/jobs");
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
      </svg>
    </button>
  );
}
