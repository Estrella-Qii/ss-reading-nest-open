import { useEffect, useMemo, useRef, useState } from "react";
import type { Annotation, CompanionComment, ReadingSession } from "@ss/shared";
import { useHorizontalPaging } from "../hooks/useHorizontalPaging.js";
import type { CompanionLayout } from "../hooks/useReadingHostLayout.js";
import {
  CompanionDock,
  type PendingCompanionCommentDraft
} from "../components/CompanionDock.js";
import { ReaderHeader } from "../components/ReaderHeader.js";
import { ReaderActions } from "../components/ReaderActions.js";
import { ReadingSyncStatus } from "../components/ReadingSyncStatus.js";
import {
  buildAnnotationTextRuns,
  readSelectionRange,
  validateAnnotationForText,
  type TextSelectionRange
} from "../features/annotations/annotation-ranges.js";

export interface NovelSelection extends TextSelectionRange {
  paragraphIndex: number;
}

export function NovelReader(props: {
  session: ReadingSession;
  chunks: string[];
  annotations?: Annotation[];
  onPosition: (index: number) => void;
  onLook: (selection: NovelSelection | null) => void;
  onCreateAnnotation?: (selection: NovelSelection, note: string) => Promise<void> | void;
  onFinish: () => void;
  onBack: () => void;
  onFullscreen: () => void;
  fullscreenLabel?: string;
  immersive?: boolean;
  onSettings: () => void;
  onMore: () => void;
  companionComments: CompanionComment[];
  companionLoading: boolean;
  companionError?: string;
  companionLayout: CompanionLayout;
  companionLayoutRevision: number;
  syncRequestInFlight: boolean;
  canRequestPip: boolean;
  onRequestPip: () => void;
  pendingCommentDraft?: PendingCompanionCommentDraft | null;
  pendingCommentSaving?: boolean;
  onSavePendingComment?: (text: string) => void;
  onClearCompanionComments: () => void;
  initialScrollTop: number;
  onScrollPosition: (scrollTop: number) => void;
}) {
  const index = Math.max(
    0,
    Math.min(props.chunks.length - 1, props.session.userCurrentPosition.index - 1)
  );
  const paragraphIndex = index + 1;
  const current = props.chunks[index] ?? "";
  const [selection, setSelection] = useState<NovelSelection | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const previous = () => props.onPosition(Math.max(1, index));
  const next = () => props.onPosition(Math.min(props.chunks.length, index + 2));
  const swipe = useHorizontalPaging(previous, next);
  const scrollRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLElement>(null);
  const manifest = props.session.sourceManifest;

  const validAnnotations = useMemo(() => {
    if (!manifest) return [];
    return (props.annotations ?? []).filter((annotation) =>
      validateAnnotationForText(
        annotation,
        current,
        manifest.contentHash,
        manifest.segmentationVersion,
        paragraphIndex
      )
    );
  }, [current, manifest, paragraphIndex, props.annotations]);
  const rejectedAnnotationCount = (props.annotations ?? []).filter(
    (annotation) => annotation.paragraphIndex === paragraphIndex
  ).length - validAnnotations.length;
  const runs = useMemo(
    () => buildAnnotationTextRuns(current, validAnnotations),
    [current, validAnnotations]
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = props.initialScrollTop;
    setSelection(null);
    setNoteOpen(false);
    setNote("");
    setActiveAnnotation(null);
  }, [index, props.companionLayoutRevision]);

  function captureSelection() {
    const value = textRef.current
      ? readSelectionRange(textRef.current, window.getSelection())
      : null;
    setSelection(value ? { ...value, paragraphIndex } : null);
    setNoteOpen(false);
    setNote("");
  }

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setNoteOpen(false);
    setNote("");
  }

  async function saveAnnotation(annotationNote: string) {
    if (!selection) return;
    await props.onCreateAnnotation?.(selection, annotationNote);
    clearSelection();
  }

  return (
    <main
      className={`reader-shell reader-with-dock companion-layout-${props.companionLayout}${
        props.immersive ? " reader-immersive" : ""
      }`}
    >
      <ReaderHeader
        title={props.session.title}
        progress={`第 ${paragraphIndex} 段 / 共 ${props.chunks.length} 段`}
        fullscreenLabel={props.fullscreenLabel}
        onBack={props.onBack}
        onFullscreen={props.onFullscreen}
        onSettings={props.onSettings}
        onMore={props.onMore}
      />
      <ReadingSyncStatus session={props.session} />
      <div className="reader-workspace">
        <section
          ref={scrollRef}
          className="reader-scroll novel-scroll"
          {...swipe}
          onScroll={(event) => props.onScrollPosition(event.currentTarget.scrollTop)}
          onMouseUp={captureSelection}
          onTouchEnd={(event) => {
            swipe.onTouchEnd(event);
            window.setTimeout(captureSelection, 0);
          }}
        >
          {rejectedAnnotationCount > 0 ? (
            <p className="annotation-source-warning" role="status">
              有 {rejectedAnnotationCount} 条批注与当前正文版本或字符范围不一致，已停止渲染。
            </p>
          ) : null}
          <article
            ref={textRef}
            className="novel-paper novel-annotation-text"
            data-paragraph-index={paragraphIndex}
          >
            {runs.map((run) => {
              const annotation = run.annotations[run.annotations.length - 1];
              if (!annotation) return <span key={run.startOffset}>{run.text}</span>;
              const authors = [...new Set(run.annotations.map((item) => item.author))];
              return (
                <mark
                  key={run.startOffset}
                  className={`text-annotation ${authors.map((author) => `text-annotation-${author}`).join(" ")}`}
                  data-annotation-count={run.annotations.length}
                  onClick={() => setActiveAnnotation(annotation)}
                >
                  {run.text}
                </mark>
              );
            })}
          </article>
          <div className="page-buttons">
            <button onClick={previous} disabled={index === 0}>上一段</button>
            <span>{paragraphIndex} / {props.chunks.length}</span>
            <button onClick={next} disabled={index >= props.chunks.length - 1}>下一段</button>
          </div>
        </section>
        <CompanionDock
          sessionId={props.session.id}
          comments={props.companionComments}
          layout={props.companionLayout}
          layoutRevision={props.companionLayoutRevision}
          loading={props.companionLoading}
          error={props.companionError}
          canRequestPip={props.canRequestPip}
          onRequestPip={props.onRequestPip}
          pendingCommentDraft={props.pendingCommentDraft}
          pendingCommentSaving={props.pendingCommentSaving}
          onSavePendingComment={props.onSavePendingComment}
          onJump={props.onPosition}
          onClear={props.onClearCompanionComments}
        />
      </div>

      {selection ? (
        <aside className="selection-actions" aria-label="所选文字操作">
          <p>“{selection.selectedText}”</p>
          <div>
            <button type="button" onClick={() => props.onLook(selection)}>叫 Elias 看这里</button>
            <button type="button" onClick={() => void saveAnnotation("")}>小辞划线</button>
            <button type="button" onClick={() => setNoteOpen(true)}>写批注</button>
          </div>
          {noteOpen ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveAnnotation(note.trim());
              }}
            >
              <textarea
                aria-label="小辞的批注"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="留下一句想法"
                autoFocus
              />
              <button type="submit" disabled={!note.trim()}>保存批注</button>
              <button type="button" onClick={clearSelection}>取消</button>
            </form>
          ) : null}
        </aside>
      ) : null}

      {activeAnnotation ? (
        <div className="annotation-detail-backdrop" role="presentation" onClick={() => setActiveAnnotation(null)}>
          <section
            className="annotation-detail"
            role="dialog"
            aria-label="正文批注"
            onClick={(event) => event.stopPropagation()}
          >
            <span>{activeAnnotation.author === "elias" ? "Elias" : "小辞"}</span>
            <blockquote>{activeAnnotation.selectedText}</blockquote>
            <p>{activeAnnotation.note || "只在这里轻轻划了一道线。"}</p>
            <button type="button" onClick={() => setActiveAnnotation(null)}>合上</button>
          </section>
        </div>
      ) : null}

      <ReaderActions
        primaryLabel="叫 Elias 看这里"
        secondaryLabel="小辞划线"
        onPrimary={() => props.onLook(selection)}
        primaryDisabled={props.syncRequestInFlight}
        onSecondary={() => selection && void saveAnnotation("")}
        secondaryDisabled={!selection}
        onFinish={props.onFinish}
      />
    </main>
  );
}
