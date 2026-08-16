import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runClassNotificationsJob = vi.fn();

vi.mock("@/lib/server/jobs/classNotificationsJob", () => ({ runClassNotificationsJob }));

const { GET } = await import("./route");

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/cron/class-notifications", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/class-notifications", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("runs the job and returns ok when the bearer secret matches", async () => {
    runClassNotificationsJob.mockResolvedValue({ notified: 2 });

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, notified: 2 });
    expect(runClassNotificationsJob).toHaveBeenCalledOnce();
  });

  it("rejects a missing Authorization header with 401", async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(runClassNotificationsJob).not.toHaveBeenCalled();
  });

  it("rejects a mismatched secret with 401", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));

    expect(res.status).toBe(401);
    expect(runClassNotificationsJob).not.toHaveBeenCalled();
  });

  it("fails closed (401) if CRON_SECRET is not configured server-side", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(401);
    expect(runClassNotificationsJob).not.toHaveBeenCalled();
  });
});
