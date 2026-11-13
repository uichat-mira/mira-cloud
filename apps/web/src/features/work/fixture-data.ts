/**
 * Presentation-only scenarios for AGT-052. They are never server or account facts.
 * Keep all example identifiers and content fictional; production data stays inaccessible.
 */
export type PreviewScenario = "active" | "empty" | "unavailable";

export interface PreviewAttention {
  id: string;
  taskId: string;
  title: string;
  context: string;
  hint: string;
  tone: "warning" | "neutral";
}

export interface PreviewTask {
  id: string;
  title: string;
  description: string;
  status: "running" | "waiting_input" | "requested";
  location: string;
  update: string;
  next: string;
}

export interface PreviewArtifact {
  id: string;
  taskId: string;
  runId?: string;
  title: string;
  type: string;
  version: string;
  updated: string;
}

export interface PreviewRun {
  id: string;
  taskId: string;
  label: string;
  status: "requested" | "running" | "completed";
  summary: string;
  updated: string;
}

export const previewAttentions: readonly PreviewAttention[] = [
  {
    id: "review-share",
    taskId: "market-research",
    title: "研究摘要，等待你的确认",
    context: "向合作伙伴分享前，需要确认披露范围。",
    hint: "待决定 · 外部发送",
    tone: "warning",
  },
  {
    id: "complete-brief",
    taskId: "brand-direction",
    title: "品牌方向还缺一份参考资料",
    context: "补充目标受众示例后，才能继续下一版。",
    hint: "待补充 · 材料",
    tone: "neutral",
  },
];

export const previewTasks: readonly PreviewTask[] = [
  {
    id: "market-research",
    title: "东南亚市场进入研究",
    description: "区域机会已完成初筛，正在核对重点市场的准入条件。",
    status: "running",
    location: "Cloud · 演示执行位置",
    update: "最近进展 · 14 分钟前（示例）",
    next: "继续核对重点市场的准入条件与资料来源",
  },
  {
    id: "brand-direction",
    title: "新品牌定位与故事",
    description: "首版方向已经形成，等待补充参考资料再继续。",
    status: "waiting_input",
    location: "Cloud · 演示执行位置",
    update: "最近进展 · 昨天（示例）",
    next: "补充目标受众参考资料后继续",
  },
  {
    id: "research-followup",
    title: "整理访谈问题清单",
    description: "已收到工作请求，尚未开始执行。",
    status: "requested",
    location: "Cloud · 执行尚未开始",
    update: "已交代 · 今天（示例）",
    next: "等待执行方开始处理",
  },
];

export const previewArtifacts: readonly PreviewArtifact[] = [
  {
    id: "market-note",
    taskId: "market-research",
    runId: "market-r04",
    title: "市场机会研究摘要",
    type: "研究笔记",
    version: "v1",
    updated: "更新于今天（示例）",
  },
  {
    id: "brand-proposal",
    taskId: "brand-direction",
    runId: "brand-r03",
    title: "品牌叙事初稿",
    type: "文档",
    version: "v2",
    updated: "更新于昨天（示例）",
  },
];

export const previewRuns: readonly PreviewRun[] = [
  {
    id: "market-r04",
    taskId: "market-research",
    label: "R04",
    status: "running",
    summary: "正在核对重点市场准入条件与来源。",
    updated: "12 分钟前（示例）",
  },
  {
    id: "market-r03",
    taskId: "market-research",
    label: "R03",
    status: "completed",
    summary: "完成区域机会初筛并留下研究摘要。",
    updated: "今天 08:10（示例）",
  },
  {
    id: "brand-r03",
    taskId: "brand-direction",
    label: "R03",
    status: "completed",
    summary: "形成两版品牌叙事方向，等待补充材料。",
    updated: "昨天（示例）",
  },
  {
    id: "followup-r01",
    taskId: "research-followup",
    label: "R01",
    status: "requested",
    summary: "工作请求已接收，尚未观察到执行开始。",
    updated: "今天（示例）",
  },
];

export const previewScenarios: readonly {
  value: PreviewScenario;
  label: string;
}[] = [
  { value: "active", label: "工作进行中" },
  { value: "empty", label: "首次使用" },
  { value: "unavailable", label: "数据不可用" },
];

export function parsePreviewScenario(value: string | null): PreviewScenario {
  if (value === "empty" || value === "unavailable") return value;
  return "active";
}

export function findPreviewTask(id: string | undefined): PreviewTask | undefined {
  return previewTasks.find((task) => task.id === id);
}

export function findPreviewArtifact(id: string | undefined): PreviewArtifact | undefined {
  return previewArtifacts.find((artifact) => artifact.id === id);
}

export function findPreviewRuns(taskId: string | undefined): readonly PreviewRun[] {
  if (!taskId) return [];
  return previewRuns.filter((run) => run.taskId === taskId);
}

export function findPreviewAttentions(taskId: string | undefined): readonly PreviewAttention[] {
  if (!taskId) return [];
  return previewAttentions.filter((attention) => attention.taskId === taskId);
}

export function findPreviewArtifacts(taskId: string | undefined): readonly PreviewArtifact[] {
  if (!taskId) return [];
  return previewArtifacts.filter((artifact) => artifact.taskId === taskId);
}
