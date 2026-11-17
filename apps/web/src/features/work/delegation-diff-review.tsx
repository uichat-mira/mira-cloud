import { ChevronDown, FileDiff } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Schema } from "@milkdown/kit/prose/model";
import type { DocumentSnapshot } from "./delegation-document";
import {
  delegationScenarios,
  type DelegationScenarioId,
  type DelegationStage,
} from "./delegation-fixtures";
import { componentDiff, textDiff, type FieldDiff, type ReviewField } from "./delegation-review-poc";

const MarkdownText = lazy(async () => {
  const { loadMarkdownText } = await import("../../components/mira-design/content");
  return loadMarkdownText();
});

// The source comparison uses POC-B's real ProseMirror diff primitive. It treats
// Markdown as source paragraphs; complex rich-text formatting needs a later POC.
const sourceSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*", toDOM: () => ["p", 0] },
    text: { group: "inline" },
  },
});

function sourceDoc(markdown: string) {
  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((part) =>
      sourceSchema.nodes.paragraph!.create(null, part ? sourceSchema.text(part) : undefined),
    );
  return sourceSchema.nodes.doc!.create(null, paragraphs);
}

export function stageFieldDiff(
  scenarioId: DelegationScenarioId,
  stage: DelegationStage,
  before: DocumentSnapshot,
  after: DocumentSnapshot,
): FieldDiff[] {
  const specs = delegationScenarios[scenarioId].sections[stage].fields;
  const collect = (snapshot: DocumentSnapshot): ReviewField[] =>
    specs.flatMap((descriptor): ReviewField[] => {
      const value = snapshot.config[descriptor.id];
      return typeof value === "string" || typeof value === "boolean"
        ? [{ id: descriptor.id, kind: descriptor.kind, label: descriptor.label, value }]
        : [];
    });
  return componentDiff(collect(before), collect(after));
}

function formattedValue(
  scenarioId: DelegationScenarioId,
  stage: DelegationStage,
  id: string,
  value: string | boolean | undefined,
) {
  if (typeof value === "boolean") return value ? "开启" : "关闭";
  const field = delegationScenarios[scenarioId].sections[stage].fields.find(
    (item) => item.id === id,
  );
  return field?.kind === "choice"
    ? (field.options.find((option) => option.value === value)?.label ?? value ?? "—")
    : (value ?? "—");
}

type Props = {
  before: DocumentSnapshot;
  after: DocumentSnapshot;
  stage: DelegationStage;
  scenarioId: DelegationScenarioId;
  adopted: boolean;
  autoScroll?: boolean;
};

export default function DelegationDiffReview({
  before,
  after,
  stage,
  scenarioId,
  adopted,
  autoScroll = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!autoScroll || !window.matchMedia?.("(max-width: 700px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      rootRef.current?.scrollIntoView?.({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoScroll]);
  const changes = useMemo(
    () => textDiff(sourceDoc(before.markdown), sourceDoc(after.markdown)),
    [before.markdown, after.markdown],
  );
  const fieldChanges = useMemo(
    () => stageFieldDiff(scenarioId, stage, before, after),
    [scenarioId, stage, before, after],
  );
  return (
    <section ref={rootRef} className="delegation-diff" aria-label="修订差异">
      <div className="delegation-diff-heading">
        <FileDiff size={18} aria-hidden="true" />
        <div>
          <strong>{adopted ? "相对上次修订前的变化" : "修订候选 · 等待你确认"}</strong>
          <p>
            原稿 r{before.revision} → 新稿 r{after.revision} · 正文 {changes.length} 处 · 字段{" "}
            {fieldChanges.length} 处
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="delegation-diff-details"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起差异" : "展开差异"}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="delegation-diff-disclaimer">
        {adopted
          ? "这是已采用的本地演示版本；批注仍须逐条确认。"
          : "预设 Fixture 的修改仅用于体验；它没有理解你的批注，是否改对由你判断。"}
      </p>
      {fieldChanges.length > 0 ? (
        <div className="delegation-diff-fields" aria-label="字段变化">
          {fieldChanges.map((change) => (
            <div key={change.id} className="delegation-diff-field">
              <span>{change.label}</span>
              <del>{formattedValue(scenarioId, stage, change.id, change.before)}</del>
              <span aria-hidden="true">→</span>
              <strong>{formattedValue(scenarioId, stage, change.id, change.after)}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {expanded ? (
        <div className="delegation-diff-details" id="delegation-diff-details">
          <p className="delegation-diff-details-title">正文变化 · 段落文字差异</p>
          {changes.length ? (
            <ol>
              {changes.map((change, index) => (
                <li key={index}>
                  {change.before ? <del>{change.before}</del> : null}
                  {change.after ? <ins>{change.after}</ins> : null}
                  <span>{change.kind}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p>正文没有文字变化。</p>
          )}
          <details className="delegation-diff-old-document">
            <summary>阅读完整旧版正文（r{before.revision}）</summary>
            <div>
              <Suspense
                fallback={
                  <p className="delegation-loading" role="status">
                    正在载入旧版正文…
                  </p>
                }
              >
                <MarkdownText features="basic">{before.markdown}</MarkdownText>
              </Suspense>
            </div>
          </details>
          <small>复杂 Markdown 格式与跨版本行内高亮尚未做浏览器级验收。</small>
        </div>
      ) : null}
    </section>
  );
}
