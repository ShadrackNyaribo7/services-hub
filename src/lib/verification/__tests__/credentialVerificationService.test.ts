import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { verifyProviderCredential } from "../credentialVerificationService";

const originalFetch = global.fetch;

function epraInput(overrides: Partial<Parameters<typeof verifyProviderCredential>[0]> = {}) {
  return {
    fullName: "Jane Wanjiku Doe",
    serviceCategory: "Electrical",
    certificationNumber: "EPRA/EW/01234",
    certificationIssuer: "Energy and Petroleum Regulatory Authority",
    certificationName: "Electrical Worker Licence",
    ...overrides,
  };
}

describe("verifyProviderCredential", () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("authoritatively verifies an active EPRA licence with the same holder", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(`
        <table><tbody><tr>
          <td>1</td><td>DOE JANE WANJIKU</td><td>Class B</td>
          <td>EPRA/EW/01234</td><td>Nairobi</td><td>2099-12-31</td>
        </tr></tbody></table>
      `),
    );

    const result = await verifyProviderCredential(epraInput());

    expect(result.level).toBe("AUTHORITATIVE");
    expect(result.holderMatched).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "LicenceApplicationSearch%5BLicenceNumber%5D=EPRA%2FEW%2F01234",
    );
  });

  it("rejects a licence that belongs to a different EPRA holder", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(`
        <table><tbody><tr>
          <td>1</td><td>JOHN OTHER PERSON</td><td>Class B</td>
          <td>EPRA/EW/01234</td><td>Nairobi</td><td>2099-12-31</td>
        </tr></tbody></table>
      `),
    );

    const result = await verifyProviderCredential(epraInput());

    expect(result.level).toBe("REJECTED");
    expect(result.reason).toContain("holder name does not match");
  });

  it("rejects a non-EPRA issuer for an electrical provider", async () => {
    const result = await verifyProviderCredential(
      epraInput({ certificationIssuer: "Unknown Training Centre" }),
    );

    expect(result.level).toBe("REJECTED");
    expect(result.issuerMatched).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires manual official evidence when EPRA is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));

    const result = await verifyProviderCredential(epraInput());

    expect(result.level).toBe("INCONCLUSIVE");
    expect(result.reason).toContain("administrator must verify");
  });

  it("corroborates an exact KNQA issuer and qualification through its two endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          `
            <input name="csrfmiddlewaretoken" value="csrf-token">
            <select id="institutionName">
              <option value="8">National Industrial Training Authority</option>
            </select>
          `,
          { headers: { "set-cookie": "csrftoken=cookie-token; Path=/" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(`
          <div><strong>Qualification Name:</strong></div>
          <div class="col-xs-6 col-sm-6">Motor Vehicle Mechanic I</div>
        `),
      );

    const result = await verifyProviderCredential({
      fullName: "Jane Wanjiku Doe",
      serviceCategory: "Mechanic",
      certificationNumber: "NITA/GTT/12345",
      certificationIssuer: "NITA",
      certificationName: "Motor Vehicle Mechanic I",
    });

    expect(result.level).toBe("CORROBORATED");
    expect(result.issuerMatched).toBe(true);
    expect(result.qualificationMatched).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://nqd.knqa.go.ke/query-qualifications/",
    );
  });

  it("does not claim holder verification from a KNQA issuer match", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(`
        <input name="csrfmiddlewaretoken" value="csrf-token">
        <select id="institutionName">
          <option value="8">National Industrial Training Authority</option>
        </select>
      `),
    );

    const result = await verifyProviderCredential({
      fullName: "Jane Wanjiku Doe",
      serviceCategory: "Mechanic",
      certificationNumber: "OTHER/12345",
      certificationIssuer: "Unknown Training Centre",
      certificationName: "Motor Vehicle Mechanic I",
    });

    expect(result.level).toBe("INCONCLUSIVE");
    expect(result.holderMatched).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
