import { describe, expect, it } from "vitest";
import type { Annotation } from "@ss/shared";
import { buildAnnotationTextRuns, validateAnnotationForText } from "./annotation-ranges.js";

const hash = "a".repeat(64);

function annotation(patch: Partial<Annotation> = {}): Annotation {
  return {
    id: "ann-1",
    sessionId: "session-1",
    paragraphIndex: 2,
    selectedText: "quiet",
    startOffset: 4,
    endOffset: 9,
    author: "xiaoci",
    note: "",
    color: "sage",
    createdAt: "2026-07-19T00:00:00.000Z",
    operationId: "op-1",
    sourceHash: hash,
    segmentationVersion: 3,
    ...patch
  };
}

describe("annotation ranges", () => {
  it("refuses stale hashes, segmentation versions, offsets, and selected text", () => {
    const text = "the quiet room";
    expect(validateAnnotationForText(annotation(), text, hash, 3, 2)).toBe(true);
    expect(validateAnnotationForText(annotation(), text, "b".repeat(64), 3, 2)).toBe(false);
    expect(validateAnnotationForText(annotation(), text, hash, 4, 2)).toBe(false);
    expect(validateAnnotationForText(annotation({ selectedText: "wrong" }), text, hash, 3, 2)).toBe(false);
    expect(validateAnnotationForText(annotation({ endOffset: 99 }), text, hash, 3, 2)).toBe(false);
  });

  it("splits overlapping annotations without losing source text", () => {
    const text = "abcdefghij";
    const runs = buildAnnotationTextRuns(text, [
      annotation({ id: "a", selectedText: "cdef", startOffset: 2, endOffset: 6 }),
      annotation({ id: "b", selectedText: "efgh", startOffset: 4, endOffset: 8, author: "elias" })
    ]);
    expect(runs.map((run) => run.text).join("")).toBe(text);
    expect(runs.find((run) => run.text === "ef")?.annotations.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
