import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { JsonReadingRepository } from "../repositories/json-reading-repository.js";
import { ReadingService } from "./reading-service.js";

const sourceHash = "a".repeat(64);

describe("ReadingService annotations", () => {
  let service: ReadingService;
  let sessionId: string;
  let databasePath: string;
  let nextId = 0;

  beforeEach(async () => {
    nextId = 0;
    const dir = await mkdtemp(join(tmpdir(), "reading-annotations-"));
    databasePath = join(dir, "reading.json");
    service = new ReadingService(
      new JsonReadingRepository(databasePath),
      { now: () => new Date("2026-07-19T00:00:00.000Z"), id: () => `id-${++nextId}` }
    );
    const session = await service.startSession("The Secret Garden", "novel");
    sessionId = session.id;
    await service.setSourceManifest(sessionId, {
      sourceId: "source-1",
      sourceKind: "file_import",
      title: "The Secret Garden",
      contentHash: sourceHash,
      segmentationVersion: 3,
      paragraphCount: 12,
      cloudSync: { enabled: false, provider: "r2" }
    });
  });

  function input(author: "xiaoci" | "elias", operationId: string) {
    return {
      sessionId,
      paragraphIndex: author === "xiaoci" ? 2 : 3,
      selectedText: "garden",
      startOffset: 4,
      endOffset: 10,
      author,
      note: author === "xiaoci" ? "我喜欢这里。" : "这里像一道门。",
      color: author === "xiaoci" ? "ochre" : "slate",
      sourceHash,
      segmentationVersion: 3,
      operationId
    } as const;
  }

  it("creates, reads, updates, and deletes annotations by both participants", async () => {
    const xiaoci = await service.createAnnotation(input("xiaoci", "create-xiaoci"));
    const elias = await service.createAnnotation(input("elias", "create-elias"));
    expect((await service.listAnnotations({ sessionId, sourceHash, segmentationVersion: 3 })).annotations)
      .toHaveLength(2);

    const updated = await service.updateAnnotation({
      sessionId, annotationId: elias.id, note: "更新后的批注。", sourceHash,
      segmentationVersion: 3, operationId: "update-elias"
    });
    expect(updated.note).toBe("更新后的批注。");

    expect((await service.deleteAnnotation({
      sessionId, annotationId: xiaoci.id, sourceHash, segmentationVersion: 3,
      operationId: "delete-xiaoci"
    })).deleted).toBe(true);
    expect((await service.listAnnotations({ sessionId, sourceHash, segmentationVersion: 3 })).annotations)
      .toEqual([expect.objectContaining({ id: elias.id, author: "elias" })]);
  });

  it("deduplicates create_annotation by operationId", async () => {
    const first = await service.createAnnotation(input("xiaoci", "same-operation"));
    const second = await service.createAnnotation(input("xiaoci", "same-operation"));
    expect(second.id).toBe(first.id);
    expect((await service.listAnnotations({ sessionId, sourceHash, segmentationVersion: 3 })).annotations)
      .toHaveLength(1);
  });

  it("restores Elias's exact annotation after reopening the persistent repository", async () => {
    const created = await service.createAnnotation(input("elias", "elias-writeback"));
    const reopened = new ReadingService(
      new JsonReadingRepository(databasePath),
      { now: () => new Date("2026-07-20T00:00:00.000Z"), id: () => "unused" }
    );

    const restored = await reopened.listAnnotations({
      sessionId,
      sourceHash,
      segmentationVersion: 3,
      paragraphIndex: 3,
      author: "elias"
    });

    expect(restored.annotations).toEqual([
      expect.objectContaining({
        id: created.id,
        paragraphIndex: 3,
        selectedText: "garden",
        startOffset: 4,
        endOffset: 10,
        author: "elias",
        note: "这里像一道门。"
      })
    ]);
  });

  it("deduplicates update and delete operations and preserves their first result", async () => {
    const created = await service.createAnnotation(input("xiaoci", "create-once"));
    const updateInput = {
      sessionId,
      annotationId: created.id,
      note: "只更新一次。",
      sourceHash,
      segmentationVersion: 3,
      operationId: "update-once"
    } as const;
    const firstUpdate = await service.updateAnnotation(updateInput);
    const repeatedUpdate = await service.updateAnnotation(updateInput);
    expect(repeatedUpdate).toEqual(firstUpdate);

    const deleteInput = {
      sessionId,
      annotationId: created.id,
      sourceHash,
      segmentationVersion: 3,
      operationId: "delete-once"
    } as const;
    const firstDelete = await service.deleteAnnotation(deleteInput);
    const repeatedDelete = await service.deleteAnnotation(deleteInput);
    expect(repeatedDelete).toEqual(firstDelete);
    expect(firstDelete.deleted).toBe(true);
  });

  it("rejects invalid offsets and mismatched source identity", async () => {
    await expect(service.createAnnotation({ ...input("xiaoci", "bad"), endOffset: 11 }))
      .rejects.toThrow("批注字符范围");
    await expect(service.listAnnotations({
      sessionId, sourceHash: "b".repeat(64), segmentationVersion: 3
    })).rejects.toThrow("正文 hash 或分段版本不匹配");
  });
});
