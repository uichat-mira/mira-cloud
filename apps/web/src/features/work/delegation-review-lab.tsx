import "./delegation-review-lab.css";
import { Renderer, JSONUIProvider } from "@json-render/react";
import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import type { EditorView } from "@milkdown/kit/prose/view";
import { TextSelection } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { ArrowLeft, MessageSquarePlus, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { delegationRegistry } from "./delegation-catalog";
import { buildDelegationSpec, delegationScenarios } from "./delegation-fixtures";
import {
  captureTextAnchor,
  componentDiff,
  resolveComponentAnchor,
  reviewAnchorKey,
  reviewAnchorPlugin,
  textDiff,
  type ReviewField,
  type TextReviewAnchor,
} from "./delegation-review-poc";

const INITIAL_MARKDOWN = [
  "## 当前研究目标",
  "请核实每项发现的出处，优先关注能落地的产品变化。",
  "这里有一条重复的判断：需要独立证据。",
  "## 工作约定",
  "每小时检查一次；有重要发现再通知。不要未经确认就向外发送。",
  "这里有一条重复的判断：需要独立证据。",
].join("\n\n");
const scenario = delegationScenarios.radar;
const originalConfig = { ...scenario.initialConfig };
const spec = buildDelegationSpec(scenario, 0, 0, 0);
const version = { stage: 0, revision: 0 } as const;

function fieldsFromSpec(config: Record<string, string | boolean>): ReviewField[] {
  return scenario.sections[0].fields.map((field) => {
    const id = "field-" + field.id;
    const expectedType = field.kind === "choice" ? "ChoiceField" : "ToggleField";
    const identity = spec.elements[id]?.type === expectedType ? { id } : {};
    return {
      ...identity,
      kind: field.kind,
      label: field.label,
      value: config[field.id] ?? "",
    };
  });
}

function LabEditor({
  onReady,
  onUpdated,
}: {
  onReady: (view: EditorView) => void;
  onUpdated: (view: EditorView) => void;
}) {
  const onReadyRef = useRef(onReady);
  const onUpdatedRef = useRef(onUpdated);
  useEffect(() => {
    onReadyRef.current = onReady;
    onUpdatedRef.current = onUpdated;
  }, [onReady, onUpdated]);
  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: INITIAL_MARKDOWN,
      features: {
        [CrepeFeature.BlockEdit]: false,
        [CrepeFeature.Toolbar]: false,
        [CrepeFeature.TopBar]: false,
        [CrepeFeature.LinkTooltip]: false,
      },
    });
    crepe.editor.use($prose(() => reviewAnchorPlugin));
    crepe.on((listener) => {
      listener.mounted((ctx) => onReadyRef.current(ctx.get(editorViewCtx)));
      listener.updated((ctx) => onUpdatedRef.current(ctx.get(editorViewCtx)));
    });
    return crepe;
  }, []);
  return <Milkdown />;
}

function displayValue(value: string | boolean | undefined) {
  return typeof value === "boolean" ? (value ? "开启" : "关闭") : (value ?? "—");
}

export default function DelegationReviewLab() {
  const [view, setView] = useState<EditorView | null>(null);
  const [baseline, setBaseline] = useState<EditorView["state"]["doc"] | null>(null);
  const [changeCount, setChangeCount] = useState(0);
  const [message, setMessage] = useState("选中文字，然后添加一条批注。");
  const [config, setConfig] = useState<Record<string, string | boolean>>(originalConfig);
  const [regenerated, setRegenerated] = useState(false);
  const [locate, setLocate] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const sequence = useRef(0);

  const onReady = useCallback((next: EditorView) => {
    setView(next);
    setBaseline(next.state.doc);
  }, []);
  const onUpdated = useCallback(() => setChangeCount((n) => n + 1), []);
  const anchors = (view && reviewAnchorKey.getState(view.state)?.anchors) ?? [];
  const changes = useMemo(
    () => (baseline && view ? textDiff(baseline, view.state.doc) : []),
    // EditorView is stable while its state changes; changeCount invalidates this comparison.
    [baseline, view, changeCount],
  );
  const fields = fieldsFromSpec(config).map((field) =>
    regenerated && field.id === "field-focus"
      ? { kind: field.kind, label: field.label, value: field.value }
      : field,
  );
  const fieldChanges = componentDiff(fieldsFromSpec(originalConfig), fields);

  const addComment = () => {
    if (!view) return;
    const anchor = captureTextAnchor(view.state, "comment-" + ++sequence.current, version);
    if (!anchor) {
      setMessage("请在正文中先框选文本，空光标不能生成文字批注。");
      return;
    }
    view.dispatch(view.state.tr.setMeta(reviewAnchorKey, { kind: "add", anchor }));
    setChangeCount((n) => n + 1);
    setMessage("已记录精确选区；原文仍在当前文档版本。");
  };
  const jumpTo = (anchor: TextReviewAnchor) => {
    if (!view || anchor.status !== "active") return;
    setActiveCommentId(anchor.id);
    view.focus();
    view.dispatch(
      view.state.tr
        .setSelection(TextSelection.create(view.state.doc, anchor.from, anchor.to))
        .scrollIntoView(),
    );
  };
  const selectDuplicate = () => {
    if (!view) return;
    const needle = "这里有一条重复的判断";
    let occurrence = 0;
    let start: number | null = null;
    view.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text || !node.text.includes(needle)) return;
      occurrence += 1;
      if (occurrence === 2) start = pos + node.text.indexOf(needle);
    });
    if (start === null) {
      setMessage("第二处重复句子已不存在。");
      return;
    }
    view.focus();
    view.dispatch(
      view.state.tr
        .setSelection(TextSelection.create(view.state.doc, start, start + needle.length))
        .scrollIntoView(),
    );
    setMessage("已在真实 Milkdown 中选中第二处重复句子，可以添加批注。");
  };
  const insertAtStart = () => {
    if (!view) return;
    view.dispatch(view.state.tr.insertText("补充说明：", 1));
    setChangeCount((n) => n + 1);
  };
  const deleteAnchor = () => {
    if (!view) return;
    const anchor = reviewAnchorKey.getState(view.state)?.anchors.find((a) => a.status === "active");
    if (!anchor) return;
    view.dispatch(view.state.tr.delete(anchor.from, anchor.to));
    setChangeCount((n) => n + 1);
    setMessage("已删除锚定文本；批注会变成定位失效，不会猜测另一处重复文本。");
  };
  const onConfigChange = (changes: Array<{ path: string; value: unknown }>) => {
    setConfig((prev) => {
      const next = { ...prev };
      for (const change of changes) {
        if (!change.path.startsWith("/config/")) continue;
        const id = change.path.slice("/config/".length);
        const field = scenario.sections[0].fields.find((f) => f.id === id);
        if (field?.kind === "toggle" && typeof change.value === "boolean") next[id] = change.value;
        if (
          field?.kind === "choice" &&
          typeof change.value === "string" &&
          field.options.some((o) => o.value === change.value)
        )
          next[id] = change.value;
      }
      return next;
    });
  };
  const reset = () => {
    setGeneration((n) => n + 1);
    setView(null);
    setBaseline(null);
    setConfig({ ...originalConfig });
    setRegenerated(false);
    setLocate(false);
    setActiveCommentId(null);
    sequence.current = 0;
    setMessage("实验已重置。");
  };
  const resolved = resolveComponentAnchor(
    { id: "field-focus", kind: "choice", version },
    version,
    fields,
  );

  return (
    <section className="review-poc-page workspace-page-body" aria-label="POC-B 批注与 Diff 实验">
      <header className="review-poc-header">
        <Link to="/new" className="review-poc-back">
          <ArrowLeft size={15} /> 返回交代工作
        </Link>
        <small>INTELLIGENT UI / POC-B</small>
        <h1>随文批注与版本 Diff</h1>
        <p>技术实验，不是真实 AI 修订或云端任务。直接操作真正的 Milkdown 和 json-render 组件。</p>
      </header>
      <div className="review-poc-columns">
        <section className="review-poc-pane" aria-label="真实正文编辑器">
          <h2>01 · 文字与锚点</h2>
          <p className="review-poc-muted">选中文字后添加批注；试着插入新段落或删除批注对应文字。</p>
          <div
            className="review-poc-editor"
            onClickCapture={(event) => {
              const target = event.target;
              if (!(target instanceof Element)) return;
              const id = target.closest("[data-anchor-id]")?.getAttribute("data-anchor-id");
              if (!id) return;
              setActiveCommentId(id);
              document.getElementById("poc-comment-" + id)?.scrollIntoView({ block: "nearest" });
            }}
          >
            <MilkdownProvider key={generation}>
              <LabEditor onReady={onReady} onUpdated={onUpdated} />
            </MilkdownProvider>
          </div>
          <div className="review-poc-actions">
            <button type="button" onClick={selectDuplicate}>
              选中第二处重复句子
            </button>
            <button type="button" onClick={addComment}>
              <MessageSquarePlus size={14} /> 批注所选文字
            </button>
            <button type="button" onClick={insertAtStart}>
              在开头插入文字
            </button>
            <button type="button" onClick={deleteAnchor}>
              <Trash2 size={14} /> 删除首个批注原文
            </button>
          </div>
          <h3>随文批注 · {anchors.length}</h3>
          <ol className="review-poc-list">
            {anchors.map((anchor) => (
              <li
                key={anchor.id}
                id={"poc-comment-" + anchor.id}
                data-selected={activeCommentId === anchor.id}
              >
                <button
                  type="button"
                  disabled={anchor.status !== "active"}
                  onClick={() => jumpTo(anchor)}
                >
                  {anchor.excerpt} · {anchor.status === "lost" ? "定位失效" : "返回原文"}
                </button>
                <small>
                  阶段 {anchor.version.stage + 1} / 修订 {anchor.version.revision}
                </small>
              </li>
            ))}
          </ol>
          {anchors.length === 0 ? <p className="review-poc-muted">尚无批注。</p> : null}
        </section>
        <section className="review-poc-pane" aria-label="版本差异与动态组件">
          <h2>02 · 正文版本对比</h2>
          <p className="review-poc-muted">Milkdown Changeset：基线与当前真实编辑器文档的变化。</p>
          <ol className="review-poc-list review-poc-diff" aria-label="正文 Diff">
            {changes.map((change, i) => (
              <li key={i}>
                <strong>{change.kind}</strong>
                {change.before ? <del>{change.before}</del> : null}
                {change.after ? <ins>{change.after}</ins> : null}
              </li>
            ))}
          </ol>
          {changes.length === 0 ? <p className="review-poc-muted">尚无正文差异。</p> : null}
          <h2 className="review-poc-divider">03 · 动态组件 Diff</h2>
          <p className="review-poc-muted">
            修改真实 json-render 选项；以 Spec 语义 ID 而非顺序或标签确认字段身份。
          </p>
          <div className="review-poc-controls">
            <JSONUIProvider
              key={generation}
              registry={delegationRegistry}
              initialState={{ config }}
              onStateChange={onConfigChange}
            >
              <Renderer spec={spec} registry={delegationRegistry} />
            </JSONUIProvider>
          </div>
          <div className="review-poc-actions">
            <button type="button" onClick={() => setRegenerated((x) => !x)}>
              {regenerated ? "恢复稳定 ID" : "模拟字段 ID 丢失"}
            </button>
            <button type="button" onClick={() => setLocate(true)}>
              定位关注重点组件
            </button>
          </div>
          {locate ? (
            <p className="review-poc-status" role="status">
              {resolved
                ? "语义 ID field-focus 定位有效；重排后仍指向同一字段。"
                : "字段缺失稳定 ID，拒绝根据文字标签猜测位置。"}
            </p>
          ) : null}
          <ol className="review-poc-list review-poc-diff" aria-label="组件 Diff">
            {fieldChanges.map((change, i) => (
              <li key={i}>
                <strong>
                  {change.label} · {change.kind}
                </strong>
                {change.before !== undefined ? <del>{displayValue(change.before)}</del> : null}
                {change.after !== undefined ? <ins>{displayValue(change.after)}</ins> : null}
              </li>
            ))}
          </ol>
          {fieldChanges.length === 0 ? (
            <p className="review-poc-muted">尚无结构化字段差异。</p>
          ) : null}
        </section>
      </div>
      <footer className="review-poc-footer">
        <p role="status">{message}</p>
        <button type="button" onClick={reset}>
          <RotateCcw size={14} /> 重置
        </button>
      </footer>
      <p className="review-poc-muted">
        实验限制：旧批注绑定原版本，不跨版本自动迁移；无法可靠定位时必须标记失效。
        未覆盖移动软键盘、密集批注避让、真实模型或多用户并发。
      </p>
    </section>
  );
}
