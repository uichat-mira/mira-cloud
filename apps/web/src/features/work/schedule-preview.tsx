import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { previewScheduleItems } from "./fixture-data";
type PreviewLink = (path: string) => string;

const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" });
const monthDay = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" });

/** A schedule visualization of explicit fictional fixtures, not a Cloud scheduler. */
export function SchedulePreview({ to }: { to: PreviewLink }) {
  const [selectedOffset, setSelectedOffset] = useState(0);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, dayOffset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
    const items = previewScheduleItems.filter((item) => item.dayOffset === dayOffset);
    return {
      dayOffset,
      shortLabel: dayOffset === 0 ? "今天" : weekday.format(date),
      dateLabel: monthDay.format(date),
      items,
    };
  });
  const selected = days[selectedOffset]!;
  const maxCount = Math.max(1, ...days.map((day) => day.items.length));

  return (
    <div className="workbench-schedule-preview">
      <p className="workbench-schedule-intro">选择日期，查看当日计划</p>
      <div className="workbench-schedule-chart" role="group" aria-label="未来七天演示计划分布">
        {days.map((day) => (
          <button
            key={day.dayOffset}
            type="button"
            className={day.dayOffset === selectedOffset ? "is-selected" : ""}
            onClick={() => setSelectedOffset(day.dayOffset)}
            aria-pressed={day.dayOffset === selectedOffset}
            aria-label={
              day.shortLabel + " " + day.dateLabel + "：" + day.items.length + " 项演示计划"
            }
          >
            <span className="workbench-schedule-count">
              {day.items.length > 0 ? day.items.length : "·"}
            </span>
            <span className="workbench-schedule-bar-track" aria-hidden="true">
              <span
                className="workbench-schedule-bar"
                style={{
                  height:
                    day.items.length === 0 ? "3px" : (day.items.length / maxCount) * 100 + "%",
                }}
              />
            </span>
            <span className="workbench-schedule-day">{day.shortLabel}</span>
            <small>{day.dateLabel}</small>
          </button>
        ))}
      </div>
      <div className="workbench-schedule-selected" aria-live="polite">
        <div className="workbench-schedule-selected-heading">
          <strong>
            {selected.shortLabel} · {selected.dateLabel}
          </strong>
          <small>{selected.items.length} 项演示安排</small>
        </div>
        {selected.items.length ? (
          <ul>
            {selected.items.map((item) => (
              <li key={item.taskId + item.dayOffset + item.time}>
                <span>{item.time}</span>
                <Link to={to("/tasks/" + item.taskId)}>
                  {item.title}
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>这一天没有安排演示计划。</p>
        )}
      </div>
      <p className="workbench-schedule-boundary">演示计划 · 未接入真实 Scheduler</p>
    </div>
  );
}
