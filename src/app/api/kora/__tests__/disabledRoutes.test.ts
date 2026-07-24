import { describe, expect, it } from "@jest/globals";
import { GET as queryVerification } from "../query/route";
import { POST as verifyIdentity } from "../verify/route";
import { POST as processWebhook } from "../webhook/route";

describe("disabled Kora routes", () => {
  it.each([
    ["verify", verifyIdentity],
    ["query", queryVerification],
    ["webhook", processWebhook],
  ])("returns 410 from the %s endpoint", async (_name, handler) => {
    const response = await handler();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/disabled/i),
      }),
    );
  });
});
