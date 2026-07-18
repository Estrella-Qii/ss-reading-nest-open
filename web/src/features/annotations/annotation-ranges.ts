import type { Annotation } from "@ss/shared";

export interface TextSelectionRange {
  selectedText: string;
  startOffset: number;
  endOffset: number;
}

export interface AnnotationTextRun {
  startOffset: number;
  endOffset: number;
  text: string;
  annotations: Annotation[];
}

export function readSelectionRange(
  container: HTMLElement,
  selection: Selection | null
): TextSelectionRange | null {
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  const prefix = range.cloneRange();
  prefix.selectNodeContents(container);
  prefix.setEnd(range.startContainer, range.startOffset);
  const startOffset = prefix.toString().length;
  const selectedText = range.toString();
  if (!selectedText) return null;
  return {
    selectedText,
    startOffset,
    endOffset: startOffset + selectedText.length
  };
}

export function validateAnnotationForText(
  annotation: Annotation,
  text: string,
  sourceHash: string,
  segmentationVersion: number,
  paragraphIndex: number
): boolean {
  return (
    annotation.paragraphIndex === paragraphIndex &&
    annotation.sourceHash === sourceHash &&
    annotation.segmentationVersion === segmentationVersion &&
    Number.isInteger(annotation.startOffset) &&
    Number.isInteger(annotation.endOffset) &&
    annotation.startOffset >= 0 &&
    annotation.endOffset > annotation.startOffset &&
    annotation.endOffset <= text.length &&
    text.slice(annotation.startOffset, annotation.endOffset) === annotation.selectedText
  );
}

export function buildAnnotationTextRuns(text: string, annotations: Annotation[]): AnnotationTextRun[] {
  const boundaries = new Set([0, text.length]);
  for (const annotation of annotations) {
    boundaries.add(annotation.startOffset);
    boundaries.add(annotation.endOffset);
  }
  const sorted = [...boundaries].sort((left, right) => left - right);
  return sorted.slice(0, -1).map((startOffset, index) => {
    const endOffset = sorted[index + 1]!;
    return {
      startOffset,
      endOffset,
      text: text.slice(startOffset, endOffset),
      annotations: annotations.filter(
        (annotation) =>
          annotation.startOffset <= startOffset && annotation.endOffset >= endOffset
      )
    };
  });
}
