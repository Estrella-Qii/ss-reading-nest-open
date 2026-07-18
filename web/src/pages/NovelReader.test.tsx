import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SESSION_PREFERENCES } from "@ss/shared";
import { NovelReader } from "./NovelReader.js";

function annotationReaderProps(author: "xiaoci" | "elias" = "xiaoci") {
  const sourceHash = "a".repeat(64);
  const annotation = {
    id: `annotation-${author}`,
    sessionId: "novel-manage-annotation",
    paragraphIndex: 1,
    selectedText: "quiet",
    startOffset: 4,
    endOffset: 9,
    author,
    note: author === "xiaoci" ? "Old note" : "Elias note",
    color: author === "xiaoci" ? "clay" : "slate",
    createdAt: "2026-07-19T00:00:00.000Z",
    operationId: `op-${author}`,
    sourceHash,
    segmentationVersion: 3
  };
  return {
    annotation,
    props: {
      session: {
        id: "novel-manage-annotation",
        title: "小说",
        type: "novel" as const,
        status: "active" as const,
        userCurrentPosition: { kind: "paragraph" as const, index: 1, total: 1, label: "第 1 段" },
        assistantSyncedPosition: null,
        liveReadingEnabled: false,
        sessionPreferences: DEFAULT_SESSION_PREFERENCES,
        sourceManifest: { sourceId: "source-1", sourceKind: "file_import" as const, contentHash: sourceHash,
          segmentationVersion: 3, paragraphCount: 1, cloudSync: { enabled: false, provider: "r2" as const } },
        createdAt: "2026-06-22T00:00:00.000Z", updatedAt: "2026-06-22T00:00:00.000Z",
        lastReadAt: "2026-06-22T00:00:00.000Z"
      },
      chunks: ["The quiet garden."],
      annotations: [annotation],
      onPosition: vi.fn(), onLook: vi.fn(), onCreateAnnotation: vi.fn(),
      onFinish: vi.fn(), onBack: vi.fn(), onFullscreen: vi.fn(), onSettings: vi.fn(), onMore: vi.fn(),
      companionComments: [], companionLoading: false, companionLayout: "wide" as const,
      companionLayoutRevision: 0, syncRequestInFlight: false, canRequestPip: false,
      onRequestPip: vi.fn(), onClearCompanionComments: vi.fn(), initialScrollTop: 0,
      onScrollPosition: vi.fn()
    }
  };
}

describe("NovelReader display layout", () => {
  it("restores the reading scroll position after fullscreen or orientation changes", () => {
    const props = {
      session: {
        id: "novel-scroll",
        title: "小说",
        type: "novel" as const,
        status: "active" as const,
        userCurrentPosition: { kind: "paragraph" as const, index: 1, total: 1, label: "第 1 段" },
        assistantSyncedPosition: null,
        liveReadingEnabled: false,
        sessionPreferences: DEFAULT_SESSION_PREFERENCES,
        sourceManifest: null,
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        lastReadAt: "2026-06-22T00:00:00.000Z"
      },
      chunks: ["第一段。"],
      onPosition: vi.fn(),
      onLook: vi.fn(),
      onSaveQuote: vi.fn(),
      onFinish: vi.fn(),
      onBack: vi.fn(),
      onFullscreen: vi.fn(),
      onSettings: vi.fn(),
      onMore: vi.fn(),
      companionComments: [],
      companionLoading: false,
      companionLayout: "wide" as const,
      syncRequestInFlight: false,
      canRequestPip: false,
      onRequestPip: vi.fn(),
      onClearCompanionComments: vi.fn(),
      initialScrollTop: 96,
      onScrollPosition: vi.fn()
    };
    const { container, rerender } = render(
      <NovelReader {...props} companionLayoutRevision={0} />
    );
    const scroll = container.querySelector<HTMLElement>(".reader-scroll")!;
    expect(scroll.scrollTop).toBe(96);
    scroll.scrollTop = 0;

    rerender(<NovelReader {...props} companionLayout="compact" companionLayoutRevision={1} />);
    expect(scroll.scrollTop).toBe(96);
  });

  it("shows the mobile selection menu and preserves the exact character range", async () => {
    const onCreateAnnotation = vi.fn();
    const props = {
      session: {
        id: "novel-selection",
        title: "小说",
        type: "novel" as const,
        status: "active" as const,
        userCurrentPosition: { kind: "paragraph" as const, index: 1, total: 1, label: "第 1 段" },
        assistantSyncedPosition: null,
        liveReadingEnabled: false,
        sessionPreferences: DEFAULT_SESSION_PREFERENCES,
        sourceManifest: {
          sourceId: "source-1",
          sourceKind: "file_import" as const,
          contentHash: "a".repeat(64),
          segmentationVersion: 3,
          paragraphCount: 1,
          cloudSync: { enabled: false, provider: "r2" as const }
        },
        createdAt: "2026-06-22T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        lastReadAt: "2026-06-22T00:00:00.000Z"
      },
      chunks: ["The quiet garden."],
      annotations: [],
      onPosition: vi.fn(),
      onLook: vi.fn(),
      onCreateAnnotation,
      onFinish: vi.fn(),
      onBack: vi.fn(),
      onFullscreen: vi.fn(),
      onSettings: vi.fn(),
      onMore: vi.fn(),
      companionComments: [],
      companionLoading: false,
      companionLayout: "compact" as const,
      companionLayoutRevision: 0,
      syncRequestInFlight: false,
      canRequestPip: false,
      onRequestPip: vi.fn(),
      onClearCompanionComments: vi.fn(),
      initialScrollTop: 0,
      onScrollPosition: vi.fn()
    };
    const { container } = render(<NovelReader {...props} />);
    const textNode = container.querySelector(".novel-annotation-text span")!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 4);
    range.setEnd(textNode, 9);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent.mouseUp(container.querySelector(".novel-scroll")!);

    expect((await screen.findAllByRole("button", { name: "叫 Elias 看这里" })).length).toBe(2);
    expect(screen.getByRole("button", { name: "写批注" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "小辞划线" })[0]!);
    await waitFor(() => expect(onCreateAnnotation).toHaveBeenCalledWith({
      paragraphIndex: 1,
      selectedText: "quiet",
      startOffset: 4,
      endOffset: 9
    }, ""));
  });

  it("opens the selection menu from the iOS-style selectionchange event", async () => {
    const { props } = annotationReaderProps("xiaoci");
    const { container } = render(<NovelReader {...props} annotations={[]} />);
    const textNode = container.querySelector(".novel-annotation-text span")!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 4);
    range.setEnd(textNode, 9);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent(document, new Event("selectionchange"));

    expect(await screen.findByRole("button", { name: "写批注" })).toBeInTheDocument();
  });

  it("opens author, source text, and note when a valid underline is clicked", () => {
    const sourceHash = "a".repeat(64);
    const props = {
      session: {
        id: "novel-annotation",
        title: "小说",
        type: "novel" as const,
        status: "active" as const,
        userCurrentPosition: { kind: "paragraph" as const, index: 1, total: 1, label: "第 1 段" },
        assistantSyncedPosition: null,
        liveReadingEnabled: false,
        sessionPreferences: DEFAULT_SESSION_PREFERENCES,
        sourceManifest: { sourceId: "source-1", sourceKind: "file_import" as const, contentHash: sourceHash,
          segmentationVersion: 3, paragraphCount: 1, cloudSync: { enabled: false, provider: "r2" as const } },
        createdAt: "2026-06-22T00:00:00.000Z", updatedAt: "2026-06-22T00:00:00.000Z",
        lastReadAt: "2026-06-22T00:00:00.000Z"
      },
      chunks: ["The quiet garden."],
      annotations: [{ id: "a1", sessionId: "novel-annotation", paragraphIndex: 1,
        selectedText: "quiet", startOffset: 4, endOffset: 9, author: "elias" as const,
        note: "Listen to the pause.", color: "slate", createdAt: "2026-07-19T00:00:00.000Z",
        operationId: "op1", sourceHash, segmentationVersion: 3 }],
      onPosition: vi.fn(), onLook: vi.fn(), onFinish: vi.fn(), onBack: vi.fn(),
      onFullscreen: vi.fn(), onSettings: vi.fn(), onMore: vi.fn(), companionComments: [],
      companionLoading: false, companionLayout: "wide" as const, companionLayoutRevision: 0,
      syncRequestInFlight: false, canRequestPip: false, onRequestPip: vi.fn(),
      onClearCompanionComments: vi.fn(), initialScrollTop: 0, onScrollPosition: vi.fn()
    };
    const { container } = render(<NovelReader {...props} />);
    fireEvent.click(container.querySelector("mark")!);
    expect(screen.getByRole("dialog", { name: "正文批注" })).toHaveTextContent("Elias");
    expect(screen.getByRole("dialog", { name: "正文批注" })).toHaveTextContent("quiet");
    expect(screen.getByRole("dialog", { name: "正文批注" })).toHaveTextContent("Listen to the pause.");
  });

  it("lets 小辞 edit a note and refreshes the open detail immediately", async () => {
    const { annotation, props } = annotationReaderProps("xiaoci");
    const updated = { ...annotation, note: "New note", updatedAt: "2026-07-20T00:00:00.000Z" };
    const onUpdateAnnotation = vi.fn(async () => updated);
    const { container } = render(<NovelReader {...props} onUpdateAnnotation={onUpdateAnnotation} />);

    fireEvent.click(container.querySelector("mark")!);
    fireEvent.click(screen.getByRole("button", { name: "编辑批注" }));
    fireEvent.change(screen.getByLabelText("编辑小辞的批注"), { target: { value: "New note" } });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() => expect(onUpdateAnnotation).toHaveBeenCalledWith(annotation, "New note"));
    expect(screen.getByRole("dialog", { name: "正文批注" })).toHaveTextContent("New note");
  });

  it("requires confirmation before deleting 小辞's annotation", async () => {
    const { annotation, props } = annotationReaderProps("xiaoci");
    const onDeleteAnnotation = vi.fn(async () => undefined);
    const { container } = render(<NovelReader {...props} onDeleteAnnotation={onDeleteAnnotation} />);

    fireEvent.click(container.querySelector("mark")!);
    fireEvent.click(screen.getByRole("button", { name: "删除批注" }));
    expect(onDeleteAnnotation).not.toHaveBeenCalled();
    expect(screen.getByText(/确定删除这条划线与批注吗/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(onDeleteAnnotation).toHaveBeenCalledWith(annotation));
    expect(screen.queryByRole("dialog", { name: "正文批注" })).not.toBeInTheDocument();
  });

  it("keeps Elias annotations read-only in the reader UI", () => {
    const { props } = annotationReaderProps("elias");
    const { container } = render(<NovelReader {...props} />);

    fireEvent.click(container.querySelector("mark")!);
    expect(screen.getByText("Elias 的批注在阅读器中只读。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "编辑批注" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除批注" })).not.toBeInTheDocument();
  });
});
