"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "theofinance:install-dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export default function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-sm z-50">
      <div className="card card-hover p-4 flex items-start gap-3 shadow-lg backdrop-blur">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--color-primary-subtle)] flex items-center justify-center">
          <Download className="w-5 h-5 text-[var(--color-primary)]" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Instalar TheoFinance</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
            Acesse mais rápido e receba alertas direto do seu dispositivo.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="btn-ghost text-xs px-3 py-1.5"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar"
          className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
