"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, CheckCheck, ClipboardCheck, ExternalLink, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LiveNotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  href: string;
};

type LiveNotificationCenterProps = {
  initialNotifications: LiveNotificationItem[];
  initialUnreadCount: number;
};

function getNotificationTone(type: string) {
  if (type === "REMANEJAMENTO_EXECUTED") {
    return {
      label: "Execucao confirmada",
      icon: ClipboardCheck,
      badgeClassName: "bg-emerald-100 text-emerald-800 border-emerald-200",
      cardClassName: "border-emerald-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.96))]",
    };
  }

  return {
    label: "Nova solicitacao",
    icon: BellRing,
    badgeClassName: "bg-amber-100 text-amber-900 border-amber-200",
    cardClassName: "border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.96))]",
  };
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function LiveNotificationCenter({
  initialNotifications,
  initialUnreadCount,
}: LiveNotificationCenterProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [toasts, setToasts] = useState<LiveNotificationItem[]>([]);
  const seenIdsRef = useRef(new Set(initialNotifications.map((notification) => notification.id)));
  const toastIdsRef = useRef(new Set<string>());
  const pollingRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    toastIdsRef.current = new Set(toasts.map((toast) => toast.id));
  }, [toasts]);

  useEffect(() => {
    const timeoutIds = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 12000),
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [toasts]);

  useEffect(() => {
    let isMounted = true;

    const refreshNotifications = async () => {
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      try {
        const response = await fetch("/api/notifications?limit=8", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          unreadCount: number;
          notifications: LiveNotificationItem[];
        };

        if (!isMounted) {
          return;
        }

        const newNotifications = data.notifications.filter(
          (notification) => !notification.isRead && !seenIdsRef.current.has(notification.id),
        );

        data.notifications.forEach((notification) => {
          seenIdsRef.current.add(notification.id);
        });

        startTransition(() => {
          setUnreadCount(data.unreadCount);

          if (!newNotifications.length) {
            return;
          }

          setToasts((current) => {
            const next = [...newNotifications.filter((item) => !toastIdsRef.current.has(item.id)), ...current];
            return next.slice(0, 4);
          });
        });
      } finally {
        isFetchingRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    };

    const handleWindowFocus = () => {
      void refreshNotifications();
    };

    pollingRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    }, 15000);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;

      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }

      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const dismissToast = (notificationId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== notificationId));
  };

  const syncUnreadState = async (payload: { action: "markRead" | "markAllRead"; notificationId?: string }) => {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      unreadCount: number;
      notifications: LiveNotificationItem[];
    };

    startTransition(() => {
      setUnreadCount(data.unreadCount);
    });
  };

  const handleOpen = async (notification: LiveNotificationItem) => {
    dismissToast(notification.id);

    if (!notification.isRead) {
      await syncUnreadState({ action: "markRead", notificationId: notification.id });
    }

    router.push(notification.href);
    router.refresh();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    dismissToast(notificationId);
    await syncUnreadState({ action: "markRead", notificationId });
  };

  const handleMarkAllAsRead = async () => {
    setToasts([]);
    await syncUnreadState({ action: "markAllRead" });
    router.refresh();
  };

  if (!toasts.length && !unreadCount) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-3 sm:right-6 sm:top-6">
      {unreadCount ? (
        <div className="pointer-events-auto animate-notification-in flex items-center justify-between rounded-[1.35rem] border border-slate-200/90 bg-white/96 px-4 py-3 shadow-panel backdrop-blur-sm">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Centro ao vivo</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {unreadCount} {unreadCount === 1 ? "notificacao pendente" : "notificacoes pendentes"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              href="/dashboard/notificacoes"
            >
              Abrir
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Button onClick={() => void handleMarkAllAsRead()} size="sm" type="button" variant="outline">
              <CheckCheck className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          </div>
        </div>
      ) : null}

      {toasts.map((notification) => {
        const tone = getNotificationTone(notification.type);
        const Icon = tone.icon;

        return (
          <article
            key={notification.id}
            className={cn(
              "pointer-events-auto animate-notification-in overflow-hidden rounded-[1.6rem] border p-4 shadow-panel backdrop-blur-sm transition",
              tone.cardClassName,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      tone.badgeClassName,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tone.label}
                  </span>
                  <span className="text-xs text-slate-500">{formatNotificationDate(notification.createdAt)}</span>
                </div>
                <p className="mt-3 text-base font-semibold leading-6 text-slate-950">{notification.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{notification.message}</p>
              </div>

              <button
                aria-label="Fechar notificacao"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 transition hover:bg-white hover:text-slate-900"
                onClick={() => dismissToast(notification.id)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button className="sm:flex-1" onClick={() => void handleOpen(notification)} size="sm" type="button">
                Abrir contexto
              </Button>
              <Button onClick={() => void handleMarkAsRead(notification.id)} size="sm" type="button" variant="outline">
                Marcar lida
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
