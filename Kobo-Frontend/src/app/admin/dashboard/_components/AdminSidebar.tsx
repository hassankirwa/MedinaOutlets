"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Users,
  Map,
  Settings,
  LogOut,
  Store,
  X,
} from "lucide-react";
import { logoutRequest, readUserProfile, type AuthUser } from "@/lib/api";
import { NotificationBell } from "@/components/NotificationBell";

type SidebarItem = {
  icon: React.ElementType;
  label: string;
  href?: string;
};

const items: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
  { icon: FolderKanban, label: "Projects", href: "/admin/projects" },
  { icon: FileText, label: "Submissions", href: "/admin/submissions" },
  { icon: Users, label: "Field Workers", href: "/admin/field-workers" },
  { icon: Map, label: "Map View", href: "/admin/map-view" },
  { icon: FileText, label: "Reports", href: "/admin/reports" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = React.useState<AuthUser | null>(null);
  const [isLgUp, setIsLgUp] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLgUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    function sync() {
      setProfile(readUserProfile());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === "userProfile" || e.key === "authToken") {
        sync();
      }
    }
    sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("kobo-profile", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("kobo-profile", sync);
    };
  }, [pathname]);

  const handleLogout = React.useCallback(async () => {
    await logoutRequest();
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userProfile");
      sessionStorage.clear();
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }

    router.push("/");
  }, [router]);

  const sidebarHiddenMobile = !isOpen && !isLgUp;

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 overflow-y-auto overflow-x-hidden bg-[#0b2a44] text-white transition-[width,transform] duration-300",
        "w-[280px] lg:translate-x-0",
        isOpen ? "translate-x-0 lg:w-[280px]" : "-translate-x-full lg:w-[84px]",
      ].join(" ")}
      aria-hidden={sidebarHiddenMobile}
      inert={sidebarHiddenMobile ? true : undefined}
    >
      <div
        className={[
          "relative z-10 flex min-h-full w-full flex-col py-6",
          isOpen ? "px-5" : "px-3",
        ].join(" ")}
      >
        <div className="mb-4 flex justify-end lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-100 hover:bg-white/20"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>
        <div
          className={[
            "mb-8 flex items-center",
            isOpen ? "justify-between gap-3" : "justify-center",
          ].join(" ")}
        >
          <div className={["flex items-center", isOpen ? "gap-3" : ""].join(" ")}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/95">
              <Store size={22} />
            </div>
            <div className={["leading-tight", isOpen ? "block" : "hidden"].join(" ")}>
              <div className="text-[14px] font-bold tracking-wide">
                OUTLET <span className="text-emerald-300">CENSUS</span>
              </div>
              <div className="text-[11px] text-slate-200/80">
                Track. Collect. Map. Empower.
              </div>
            </div>
          </div>
          <div className={isOpen ? "shrink-0 [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/15 [&_span]:text-white" : "hidden"}>
            <NotificationBell />
          </div>
        </div>
        {!isOpen ? (
          <div className="mb-4 flex justify-center [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/15 [&_span]:text-white">
            <NotificationBell />
          </div>
        ) : null}

        <nav className="space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = Boolean(
              it.href &&
                (pathname === it.href ||
                  (it.href !== "/admin/dashboard" && pathname.startsWith(`${it.href}/`))),
            );
            const className = [
              "flex w-full items-center rounded-lg py-2.5 text-left text-[13px] transition-colors",
              isOpen ? "gap-3 px-4" : "justify-center px-2",
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-200/85 hover:bg-white/10 hover:text-white",
            ].join(" ");

            const content = (
              <>
                <Icon size={18} className={isActive ? "text-white" : "text-slate-200/85"} />
                <span className={isOpen ? "inline" : "hidden"}>{it.label}</span>
              </>
            );

            if (it.href) {
              return (
                <Link key={it.label} href={it.href} title={it.label} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={it.label}
                type="button"
                title={it.label}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div
            className={[
              "rounded-2xl bg-white/10 backdrop-blur",
              isOpen ? "p-4" : "p-2",
            ].join(" ")}
          >
            <div
              className={[
                "mb-4 flex items-center",
                isOpen ? "gap-3" : "justify-center",
              ].join(" ")}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/25"
                  width={44}
                  height={44}
                />
              ) : (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/95 text-[13px] font-bold text-white"
                  aria-hidden
                >
                  {profile ? initialsFromName(profile.name) : "—"}
                </div>
              )}
              <div className={["leading-tight", isOpen ? "block" : "hidden"].join(" ")}>
                <div className="text-[13px] font-semibold text-white">
                  {profile?.name ?? "Signed in"}
                </div>
                <div className="text-[11px] text-slate-200/70">
                  {profile?.role?.name ?? "Role"}
                  {profile?.company?.name ? ` · ${profile.company.name}` : ""}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={[
                "flex items-center text-[12px] text-slate-200/80 hover:text-white",
                isOpen ? "gap-2" : "justify-center",
              ].join(" ")}
              title="Logout"
            >
              <LogOut size={16} />
              <span className={isOpen ? "inline" : "hidden"}>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
        <div className="absolute -bottom-10 left-0 right-0 h-[260px] opacity-80">
          <Image
            src="/sidebar-mountains.svg"
            alt=""
            fill
            className="object-cover"
            loading="eager"
          />
        </div>
      </div>
    </aside>
  );
}
