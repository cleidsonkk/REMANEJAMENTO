import { logInfo } from "@/lib/observability";

export async function register() {
  logInfo("app.runtime.register", {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    region: process.env.VERCEL_REGION ?? "local",
    commitSha: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
  });
}
