import { NextResponse } from "next/server";

import { createRequestId, logInfo, reportServerError } from "@/lib/observability";
import { getPublicHealthSnapshot } from "@/services/system-health.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = createRequestId(request.headers.get("x-vercel-id"));

  try {
    logInfo("api.health.start", {
      requestId,
      route: "/api/health",
    });

    const snapshot = await getPublicHealthSnapshot();
    const statusCode = snapshot.status === "unhealthy" ? 503 : 200;

    logInfo("api.health.done", {
      requestId,
      route: "/api/health",
      durationMs: Date.now() - startedAt,
      status: snapshot.status,
    });

    return NextResponse.json(snapshot, { status: statusCode });
  } catch (error) {
    reportServerError("api.health.failed", error, {
      requestId,
      route: "/api/health",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        status: "unhealthy",
        checkedAt: new Date().toISOString(),
        error: "Nao foi possivel verificar a saude do sistema.",
      },
      { status: 503 },
    );
  }
}
