import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "le-rituel-install-dismissed";
const IOS_KEY = "le-rituel-ios-install-seen";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPad on iOS 13+ reports as Mac; check touch points as a fallback.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/**
 * Subtle "Install app" nudge.
 * - Android Chrome: listens for the `beforeinstallprompt` event and shows a
 *   pill CTA; on click, fires the native install dialog.
 * - iOS Safari: no beforeinstallprompt exists. We show a one-time hint with
 *   the Add-to-Home-Screen icon path.
 * - If already installed (standalone) or previously dismissed → renders nothing.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissed = typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";
    if (dismissed) return;

    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari path — show the tip once ever.
    if (isIOS() && !localStorage.getItem(IOS_KEY)) {
      const t = setTimeout(() => setIosHint(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
    setVisible(false);
    setIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* user closed */
    }
    setDeferred(null);
    setVisible(false);
  };

  const dismissIOS = () => {
    try {
      localStorage.setItem(IOS_KEY, "1");
    } catch {
      /* private mode */
    }
    setIosHint(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="android"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.35 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
          data-testid="install-prompt"
        >
          <div className="rounded-full bg-[#2B3024] text-[#F9F8F5] pl-2 pr-2 py-2 shadow-[0_16px_44px_rgba(43,48,36,0.35)] flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#2B3024] grid place-items-center flex-shrink-0">
              <Smartphone className="w-4 h-4" strokeWidth={1.6} />
            </span>
            <div className="flex-1 min-w-0 py-1">
              <p className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#F9F8F5]/60">Install</p>
              <p className="text-sm truncate">Add Le Rituel to your home screen</p>
            </div>
            <button
              onClick={install}
              data-testid="install-prompt-install"
              className="text-[10px] tracking-[0.18em] uppercase font-bold rounded-full bg-[#F9F8F5]/15 hover:bg-[#F9F8F5]/25 px-3 py-2 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              Install
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              data-testid="install-prompt-dismiss"
              className="w-8 h-8 rounded-full hover:bg-[#F9F8F5]/10 grid place-items-center"
            >
              <X className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
        </motion.div>
      )}

      {iosHint && (
        <motion.div
          key="ios"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.35 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
          data-testid="install-prompt-ios"
        >
          <div className="rounded-3xl bg-[#2B3024] text-[#F9F8F5] px-5 py-4 shadow-[0_16px_44px_rgba(43,48,36,0.35)]">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-[#F3E8E0] text-[#2B3024] grid place-items-center flex-shrink-0">
                <Smartphone className="w-4 h-4" strokeWidth={1.6} />
              </span>
              <div className="flex-1">
                <p className="text-[10px] tracking-[0.24em] uppercase font-bold text-[#F9F8F5]/60">Install on iPhone</p>
                <p className="text-sm mt-1 leading-relaxed">
                  Tap the <span className="font-medium">Share</span> button in Safari, then{" "}
                  <span className="font-medium">Add to Home Screen</span>.
                </p>
              </div>
              <button
                onClick={dismissIOS}
                aria-label="Dismiss"
                data-testid="install-prompt-ios-dismiss"
                className="w-8 h-8 rounded-full hover:bg-[#F9F8F5]/10 grid place-items-center flex-shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
