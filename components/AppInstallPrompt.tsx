"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export function AppInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installError, setInstallError] = useState("");
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    setIos(isIos);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const mobile = window.matchMedia("(max-width: 767px)").matches || navigator.maxTouchPoints > 0;
    const shouldPrompt = mobile && !standalone && !sessionStorage.getItem("rudraksha-install-dismissed");
    if (shouldPrompt && isIos) window.setTimeout(() => setVisible(true), 900);

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
      if (shouldPrompt) setVisible(true);
    };
    const installed = () => { setVisible(false); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  function close() {
    sessionStorage.setItem("rudraksha-install-dismissed", "1");
    setVisible(false);
  }

  async function install() {
    if (!deferred) {
      setInstallError("One-tap install is not available in this browser yet.");
      return;
    }
    setInstallError("");
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferred(null);
    if (choice.outcome === "dismissed") close();
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#09251b]/55 p-3 backdrop-blur-sm sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="install-title" className="w-full max-w-md rounded-2xl border border-forest-200 bg-pearl p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={close} aria-label="Close install prompt" className="float-right grid h-10 w-10 place-items-center rounded-full text-xl text-forest-700 hover:bg-forest-100">×</button>
        <div className="flex items-center gap-4">
          <Image src="/rudrakshanobg.png" alt="Rudraksha Events" width={72} height={72} className="h-[72px] w-[72px] rounded-xl object-cover" />
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-gold-700">Rudraksha Events</p><h2 id="install-title" className="mt-1 text-2xl">Install our app</h2></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-700">Add the recruitment portal to your home screen for quick access to positions, applications and your profile.</p>
        {ios && <div className="mt-4 rounded-xl border border-forest-200 bg-white p-3 text-sm text-stone-700"><p>On iPhone, use Safari’s <strong>Share</strong> menu and choose <strong>Add to Home Screen</strong>.</p></div>}
        {installError && <p role="status" className="mt-3 text-sm text-stone-600">{installError}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={close} className="btn-outline flex-1">Maybe later</button>
          <div className="grid flex-1 gap-2">
            <button type="button" onClick={() => void install()} disabled={!deferred} className="btn-outline w-full disabled:cursor-not-allowed disabled:opacity-50">Add to Home Screen</button>
            <button type="button" onClick={() => void install()} disabled={!deferred} className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-50">Install App</button>
          </div>
        </div>
      </section>
    </div>
  );
}
