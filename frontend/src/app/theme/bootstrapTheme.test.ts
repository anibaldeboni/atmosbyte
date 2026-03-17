import { applyInitialTheme } from "./bootstrapTheme"

function createDocumentMock(windowLike?: Window): Document {
  return {
    defaultView: windowLike,
    documentElement: {
      dataset: {},
    },
  } as unknown as Document
}

test("bootstrap applies dark theme when storage prefers dark", () => {
  const mockWindow = {
    localStorage: {
      getItem: () => "dark",
    },
    matchMedia: () => ({ matches: false }),
  } as unknown as Window

  const doc = createDocumentMock(mockWindow)

  const theme = applyInitialTheme(doc)

  expect(theme).toBe("dark")
  expect(doc.documentElement.dataset.theme).toBe("dark")
})

test("bootstrap defaults to light when storage/media access throws", () => {
  const mockWindow = {
    localStorage: {
      getItem: () => {
        throw new Error("blocked")
      },
    },
    matchMedia: () => {
      throw new Error("blocked")
    },
  } as unknown as Window

  const doc = createDocumentMock(mockWindow)

  const theme = applyInitialTheme(doc)

  expect(theme).toBe("light")
  expect(doc.documentElement.dataset.theme).toBe("light")
})
