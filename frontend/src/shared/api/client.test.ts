import { ApiError, client } from "./client"

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

test("maps HTTP errors to ApiError with details", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    json: jest.fn().mockResolvedValue({ error: "sensor unavailable", code: 500, timestamp: "2026-03-17T00:00:00Z" }),
  } as unknown as Response)

  await expect(client.getMeasurements()).rejects.toMatchObject({
    kind: "http",
    status: 500,
    details: "sensor unavailable",
  })
})

test("maps parse failures for invalid payload", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ timestamp: "bad" }),
  } as unknown as Response)

  await expect(client.getMeasurements()).rejects.toMatchObject({
    kind: "parse",
  })
})

test("maps network errors", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("offline"))

  await expect(client.getHealth()).rejects.toMatchObject({
    kind: "network",
  })
})

test("parses historical payload with unknown input", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue([
      {
        type: "hour",
        date: 1710633600,
        temp: { min: 20, average: 22, max: 24 },
        humidity: { min: 50, average: 52, max: 55 },
        pressure: { min: 100000, average: 100200, max: 100300 },
      },
    ]),
  } as unknown as Response)

  const data = await client.getHistorical({
    from: "2026-03-16T00:00:00Z",
    to: "2026-03-17T00:00:00Z",
    type: "h",
  })

  expect(data).toHaveLength(1)
  expect(data[0]?.type).toBe("hour")
})
