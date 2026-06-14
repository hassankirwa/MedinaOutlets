"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Menu,
  Phone,
  UserRound,
} from "lucide-react";
import { AdminShell } from "../../dashboard/_components/AdminShell";
import {
  fetchOutletById,
} from "@/lib/api";
import { normalizeOutletType } from "@/lib/outletTransform";
import type { ApiOutletRow } from "@/lib/outletTransform";
import { outletMediaBypassNextOptimizer, resolveOutletMediaUrl } from "@/lib/mediaUrl";

export default function SubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = params?.id ?? "";
  const [row, setRow] = React.useState<ApiOutletRow | null>(null);
  const [loadState, setLoadState] = React.useState<"loading" | "ok" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!rawId) {
      setLoadState("error");
      setLoadError("Missing submission id.");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadState("loading");
      setLoadError(null);
      try {
        const data = await fetchOutletById(rawId);
        if (cancelled) {
          return;
        }
        setRow(data);
        setLoadState("ok");
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load submission");
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawId]);

  const photos = React.useMemo(
    () => (row?.photo_urls?.length ? row.photo_urls.map(resolveOutletMediaUrl) : []),
    [row?.photo_urls],
  );

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
                onClick={toggleSidebar}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <Link
                  href="/admin/submissions"
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <ArrowLeft size={14} />
                  Back to Submissions
                </Link>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">
                  {loadState === "loading" ? "Loading…" : row?.name ?? "Submission"}
                </h1>
                <p className="text-xs text-slate-500">ID #{rawId}</p>
              </div>
            </div>
          </header>

          {loadError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          )}

          {row && loadState === "ok" && (
            <div className="mt-6 space-y-6">
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
                  <h2 className="text-sm font-semibold text-slate-900">Facility</h2>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">Account type</dt>
                      <dd className="font-medium text-slate-800">{normalizeOutletType(row.type)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Registration</dt>
                      <dd className="font-medium text-slate-800">{row.accountStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Owner</dt>
                      <dd className="flex items-center gap-1 font-medium text-slate-800">
                        <UserRound size={14} className="text-slate-400" />
                        {row.owner}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Phone</dt>
                      <dd className="flex items-center gap-1 font-medium text-slate-800">
                        <Phone size={14} className="text-slate-400" />
                        {row.phone || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">Location</dt>
                      <dd className="flex items-start gap-1 font-medium text-slate-800">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                        {row.location}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Coordinates</dt>
                      <dd className="font-mono text-xs text-slate-700">
                        {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Medina serviced</dt>
                      <dd className="font-medium text-slate-800">{row.servicedByMedilab}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Field worker</dt>
                      <dd className="font-medium text-slate-800">{row.fieldWorker || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Submitted</dt>
                      <dd className="font-medium text-slate-800">{row.submittedAt}</dd>
                    </div>
                    {row.raw?.selected_category ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-500">Category</dt>
                        <dd className="font-medium text-slate-800">{row.raw.selected_category}</dd>
                      </div>
                    ) : null}
                    {row.raw?.remarks ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-500">Remarks</dt>
                        <dd className="text-slate-700">{row.raw.remarks}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Photos below mirror what is stored for this outlet (or dev placeholders when none).
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/admin/map-view")}
                    className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open map view
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Facility images ({photos.length})
                </h2>
                {photos.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No images available for this submission.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {photos.map((src, i) => (
                      <a
                        key={`${src}-${i}`}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-100 bg-slate-50"
                      >
                        <Image
                          src={src}
                          alt={`Facility photo ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized={outletMediaBypassNextOptimizer(src)}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
