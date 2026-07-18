import { describe, expect, it } from "vitest";
import {
  createAnnotationInputSchema,
  deleteAnnotationInputSchema,
  listAnnotationsInputSchema,
  updateAnnotationInputSchema
} from "./tool-schemas.js";

const sourceHash = "a".repeat(64);

describe("annotation MCP schemas", () => {
  it("accepts an exact UTF-16 range for either participant", () => {
    const result = createAnnotationInputSchema.parse({
      sessionId: "session-1",
      paragraphIndex: 2,
      selectedText: "quiet",
      startOffset: 7,
      endOffset: 12,
      author: "elias",
      note: "This pause matters.",
      color: "slate",
      sourceHash,
      segmentationVersion: 3,
      operationId: "annotation-create-1"
    });
    expect(result.endOffset).toBe(12);
  });

  it.each([
    { startOffset: 4, endOffset: 4, selectedText: "x" },
    { startOffset: 4, endOffset: 6, selectedText: "x" },
    { startOffset: -1, endOffset: 1, selectedText: "x" }
  ])("rejects an invalid offset range %#", (range) => {
    expect(() =>
      createAnnotationInputSchema.parse({
        sessionId: "session-1",
        paragraphIndex: 1,
        author: "xiaoci",
        note: "",
        color: "ochre",
        sourceHash,
        segmentationVersion: 3,
        operationId: "bad-range",
        ...range
      })
    ).toThrow();
  });

  it("keeps list/update/delete contracts aligned around the source guard", () => {
    expect(listAnnotationsInputSchema.safeParse({
      sessionId: "session-1", sourceHash, segmentationVersion: 3
    }).success).toBe(true);
    expect(updateAnnotationInputSchema.safeParse({
      sessionId: "session-1", annotationId: "a1", note: "new", sourceHash,
      segmentationVersion: 3, operationId: "update-1"
    }).success).toBe(true);
    expect(deleteAnnotationInputSchema.safeParse({
      sessionId: "session-1", annotationId: "a1", sourceHash,
      segmentationVersion: 3, operationId: "delete-1"
    }).success).toBe(true);
  });
});
