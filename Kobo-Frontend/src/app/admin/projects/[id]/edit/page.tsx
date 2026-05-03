"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy URL; canonical route is /admin/projects/edit/[id]. */
export default function LegacyProjectEditRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  React.useEffect(() => {
    if (id) {
      router.replace(`/admin/projects/edit/${id}`);
    }
  }, [id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      Opening editor…
    </div>
  );
}
