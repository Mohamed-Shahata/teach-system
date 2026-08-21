import { beforeEach, describe, expect, it, vi } from "vitest";

const runSubscriptionRenewalNotificationsJob = vi.fn();
vi.mock("@/lib/server/jobs/subscriptionRenewalNotificationsJob", () => ({
  runSubscriptionRenewalNotificationsJob,
}));

const { GET } = await import("./route");

const OLD_ENV = process.env;

describe("GET /api/cron/subscription-renewal-notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET: "test-secret" };
  });

  it("runs the sweep job when the bearer secret matches", async () => {
    runSubscriptionRenewalNotificationsJob.mockResolvedValue({ notified: 3 });

    const req = new Request("https://example.com/api/cron/subscription-renewal-notifications", {
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, notified: 3 });
  });

  it("rejects a missing/mismatched bearer secret", async () => {
    const req = new Request("https://example.com/api/cron/subscription-renewal-notifications");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(runSubscriptionRenewalNotificationsJob).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET isn't configured", async () => {
    process.env = { ...OLD_ENV };
    delete process.env.CRON_SECRET;

    const req = new Request("https://example.com/api/cron/subscription-renewal-notifications", {
      headers: { authorization: "Bearer anything" },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
