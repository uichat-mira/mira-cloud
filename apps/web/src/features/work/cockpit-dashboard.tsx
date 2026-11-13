import { useCallback, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button, Card, ModalShell } from "../../components/mira-design/index.ts";
import {
  defaultCockpitLayout,
  persistCockpitLayout,
  readCockpitLayout,
  type CockpitLayout,
  type CockpitWidgetId,
} from "./cockpit-preferences";

export interface CockpitWidget {
  id: CockpitWidgetId;
  title: string;
  action?: ReactNode;
  content: ReactNode;
}

function moveWidget(layout: CockpitLayout, id: CockpitWidgetId, direction: -1 | 1): CockpitLayout {
  const visible = layout.order.filter((item) => !layout.hidden.includes(item));
  const index = visible.indexOf(id);
  const neighbor = visible[index + direction];
  if (!neighbor) return layout;

  const order = [...layout.order];
  const from = order.indexOf(id);
  const to = order.indexOf(neighbor);
  [order[from], order[to]] = [order[to]!, order[from]!];
  return { ...layout, order };
}

function CockpitLayoutEditor({
  widgets,
  draft,
  onChange,
}: {
  widgets: readonly CockpitWidget[];
  draft: CockpitLayout;
  onChange: (next: CockpitLayout) => void;
}) {
  const visible = draft.order.filter((id) => !draft.hidden.includes(id));

  function toggleVisibility(id: CockpitWidgetId) {
    const hidden = draft.hidden.includes(id);
    if (!hidden && visible.length <= 1) return;
    onChange({
      ...draft,
      hidden: hidden ? draft.hidden.filter((item) => item !== id) : [...draft.hidden, id],
    });
  }

  function toggleWidth(id: CockpitWidgetId) {
    onChange({
      ...draft,
      wide: draft.wide.includes(id)
        ? draft.wide.filter((item) => item !== id)
        : [...draft.wide, id],
    });
  }

  return (
    <div className="workbench-cockpit-modal-content">
      <p className="workbench-cockpit-modal-intro">
        调整卡片的顺序、尺寸和显示状态。完成后应用到工作台。
      </p>
      <div className="workbench-cockpit-modal-list" role="list" aria-label="卡片布局">
        {draft.order.map((id) => {
          const widget = widgets.find((item) => item.id === id);
          if (!widget) return null;
          const hidden = draft.hidden.includes(id);
          const index = visible.indexOf(id);
          const wide = draft.wide.includes(id);

          return (
            <div
              key={id}
              role="listitem"
              aria-label={widget.title}
              className="workbench-cockpit-modal-row"
              data-hidden={hidden}
            >
              <div className="workbench-cockpit-modal-label">
                <strong>{widget.title}</strong>
                <small>{hidden ? "已隐藏" : wide ? "通栏" : "半宽"}</small>
              </div>
              <div className="workbench-cockpit-modal-row-actions">
                <button
                  type="button"
                  disabled={hidden || index === 0}
                  aria-label={"上移" + widget.title}
                  onClick={() => onChange(moveWidget(draft, id, -1))}
                >
                  <ArrowUp size={14} aria-hidden="true" />
                  上移
                </button>
                <button
                  type="button"
                  disabled={hidden || index === visible.length - 1}
                  aria-label={"下移" + widget.title}
                  onClick={() => onChange(moveWidget(draft, id, 1))}
                >
                  <ArrowDown size={14} aria-hidden="true" />
                  下移
                </button>
                <button
                  type="button"
                  disabled={hidden}
                  aria-label={(wide ? "改为半宽" : "改为通栏") + widget.title}
                  onClick={() => toggleWidth(id)}
                >
                  {wide ? "半宽" : "通栏"}
                </button>
                <button
                  type="button"
                  disabled={!hidden && visible.length <= 1}
                  aria-label={(hidden ? "显示" : "隐藏") + widget.title}
                  onClick={() => toggleVisibility(id)}
                >
                  {hidden ? "显示" : "隐藏"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="workbench-cockpit-modal-footnote">
        <button
          type="button"
          className="workbench-cockpit-reset"
          onClick={() => onChange(defaultCockpitLayout())}
        >
          <RotateCcw size={14} aria-hidden="true" />
          恢复默认
        </button>
        <small>布局只保存在当前浏览器，不会同步到其他设备。</small>
      </div>
    </div>
  );
}

export function CockpitDashboard({
  widgets,
  onCreate,
}: {
  widgets: readonly CockpitWidget[];
  onCreate: () => void;
}) {
  const [layout, setLayout] = useState(readCockpitLayout);
  const [draft, setDraft] = useState(layout);
  const [editing, setEditing] = useState(false);
  const visible = layout.order
    .filter((id) => !layout.hidden.includes(id))
    .map((id) => widgets.find((widget) => widget.id === id))
    .filter((widget): widget is CockpitWidget => Boolean(widget));

  function openEditor() {
    setDraft(layout);
    setEditing(true);
  }

  const closeEditor = useCallback(() => setEditing(false), []);

  function finishEditor() {
    setLayout(draft);
    persistCockpitLayout(draft);
    closeEditor();
  }

  return (
    <div className="workbench-cockpit">
      <div className="workbench-cockpit-toolbar">
        <p>演示数据 · 未接入云端任务服务</p>
        <div className="workbench-cockpit-toolbar-actions">
          <button type="button" className="workbench-primary-link" onClick={onCreate}>
            <Plus size={15} aria-hidden="true" />
            交代工作
          </button>
          <button type="button" className="workbench-cockpit-customize" onClick={openEditor}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            调整工作台
          </button>
        </div>
      </div>

      <div className="workbench-cockpit-grid" aria-label="工作驾驶舱">
        {visible.map((widget) => (
          <Card
            key={widget.id}
            variant="default"
            padding="none"
            className="workbench-cockpit-card"
            data-span={layout.wide.includes(widget.id) ? "wide" : "normal"}
          >
            <section aria-label={widget.title} className="workbench-cockpit-card-inner">
              <header className="workbench-cockpit-card-header">
                <div>
                  <h2>{widget.title}</h2>
                </div>
                {widget.action ? <div>{widget.action}</div> : null}
              </header>
              <div className="workbench-cockpit-card-content">{widget.content}</div>
            </section>
          </Card>
        ))}
      </div>

      <ModalShell
        open={editing}
        title="调整工作台"
        width={680}
        maxHeight="calc(100dvh - 2rem)"
        closeLabel="关闭工作台布局设置"
        onClose={closeEditor}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeEditor}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={finishEditor}>
              完成
            </Button>
          </>
        }
      >
        <CockpitLayoutEditor widgets={widgets} draft={draft} onChange={setDraft} />
      </ModalShell>
    </div>
  );
}
