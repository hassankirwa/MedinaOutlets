"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy county/ward editor retired — redirect to project workspace settings. */
export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  React.useEffect(() => {
    if (id) {
      router.replace(`/admin/projects/${id}?tab=settings`);
    }
  }, [id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      Opening project settings…
    </div>
  );
}
