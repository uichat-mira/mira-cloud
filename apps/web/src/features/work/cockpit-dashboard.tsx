import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Card } from "../../components/mira-design/index.ts";
import {
  cockpitWidgetIds,
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

export function CockpitDashboard({ widgets }: { widgets: readonly CockpitWidget[] }) {
  const [layout, setLayout] = useState(readCockpitLayout);
  const [editing, setEditing] = useState(false);
  const available = widgets.filter((widget) => cockpitWidgetIds.includes(widget.id));
  const visible = layout.order
    .filter((id) => !layout.hidden.includes(id))
    .map((id) => available.find((widget) => widget.id === id))
    .filter((widget): widget is CockpitWidget => Boolean(widget));

  function applyLayout(next: CockpitLayout) {
    setLayout(next);
    persistCockpitLayout(next);
  }

  function move(id: CockpitWidgetId, direction: -1 | 1) {
    const index = visible.findIndex((widget) => widget.id === id);
    const neighbor = visible[index + direction];
    if (!neighbor) return;
    const nextOrder = [...layout.order];
    const from = nextOrder.indexOf(id);
    const to = nextOrder.indexOf(neighbor.id);
    [nextOrder[from], nextOrder[to]] = [nextOrder[to]!, nextOrder[from]!];
    applyLayout({ ...layout, order: nextOrder });
  }

  function toggleVisibility(id: CockpitWidgetId) {
    if (!layout.hidden.includes(id) && visible.length <= 1) return;
    applyLayout({
      ...layout,
      hidden: layout.hidden.includes(id)
        ? layout.hidden.filter((item) => item !== id)
        : [...layout.hidden, id],
    });
  }

  function toggleWidth(id: CockpitWidgetId) {
    applyLayout({
      ...layout,
      wide: layout.wide.includes(id)
        ? layout.wide.filter((item) => item !== id)
        : [...layout.wide, id],
    });
  }

  return (
    <div className="workbench-cockpit">
      <div className="workbench-cockpit-toolbar">
        <p>演示数据 · 未接入云端任务服务</p>
        <button
          type="button"
          className="workbench-cockpit-customize"
          aria-expanded={editing}
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <SlidersHorizontal size={15} aria-hidden="true" />
          )}
          {editing ? "完成调整" : "调整工作台"}
        </button>
      </div>

      {editing ? (
        <div className="workbench-cockpit-editor" aria-label="工作台布局设置">
          <div className="workbench-cockpit-visibility" role="group" aria-label="显示的卡片">
            {widgets.map((widget) => (
              <label key={widget.id}>
                <input
                  type="checkbox"
                  checked={!layout.hidden.includes(widget.id)}
                  disabled={!layout.hidden.includes(widget.id) && visible.length === 1}
                  onChange={() => toggleVisibility(widget.id)}
                />
                {widget.title}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="workbench-cockpit-reset"
            onClick={() => applyLayout(defaultCockpitLayout())}
          >
            <RotateCcw size={14} aria-hidden="true" />
            恢复默认
          </button>
          <small>布局只保存在当前浏览器，不会同步到其他设备。</small>
        </div>
      ) : null}

      <div className="workbench-cockpit-grid" aria-label="工作驾驶舱">
        {visible.map((widget, index) => (
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
                {!editing && widget.action ? <div>{widget.action}</div> : null}
              </header>
              {editing ? (
                <div className="workbench-cockpit-card-edit" aria-label={widget.title + "布局操作"}>
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={"上移" + widget.title}
                    onClick={() => move(widget.id, -1)}
                  >
                    <ArrowUp size={14} aria-hidden="true" /> 上移
                  </button>
                  <button
                    type="button"
                    disabled={index === visible.length - 1}
                    aria-label={"下移" + widget.title}
                    onClick={() => move(widget.id, 1)}
                  >
                    <ArrowDown size={14} aria-hidden="true" /> 下移
                  </button>
                  <button type="button" onClick={() => toggleWidth(widget.id)}>
                    {layout.wide.includes(widget.id) ? "改为半宽" : "改为通栏"}
                  </button>
                  <button
                    type="button"
                    disabled={visible.length <= 1}
                    onClick={() => toggleVisibility(widget.id)}
                  >
                    隐藏
                  </button>
                </div>
              ) : null}
              <div className="workbench-cockpit-card-content">{widget.content}</div>
            </section>
          </Card>
        ))}
      </div>
    </div>
  );
}
