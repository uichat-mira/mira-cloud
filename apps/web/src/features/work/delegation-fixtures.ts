import type { Spec } from "@json-render/core";

export type DelegationScenarioId = "radar" | "journey" | "venture" | "custom";
export type DelegationStage = 0 | 1 | 2;

type Choice = { value: string; label: string };
type Field =
  | { kind: "choice"; id: string; label: string; options: Choice[] }
  | { kind: "toggle"; id: string; label: string; description: string };

export interface DelegationScenario {
  id: DelegationScenarioId;
  label: string;
  title: string;
  tagline: string;
  intent: string;
  text: string;
  initialConfig: Record<string, string | boolean>;
  stages: readonly [string, string, string];
  sections: readonly [
    { description: string; fields: readonly Field[]; note: string },
    { description: string; fields: readonly Field[]; note: string },
    { description: string; fields: readonly Field[]; note: string },
  ];
}

export const delegationScenarios: Record<DelegationScenarioId, DelegationScenario> = {
  custom: {
    id: "custom",
    label: "我的委托",
    title: "把这件事交代清楚",
    tagline: "先明确目标，再决定如何持续推进。",
    intent: "请先帮我整理一件需要持续完成的工作。",
    text: "请从这件事情的目标出发，辨明需要核实的材料和关键决定。不替我假定事实、权限或外部行动。",
    initialConfig: {
      approach: "clarify",
      askOnDecisions: true,
      frequency: "24h",
      importantOnly: true,
      deliverable: "summary",
      externalActions: false,
    },
    stages: ["工作目标", "工作节奏", "交付与边界"],
    sections: [
      {
        description: "先把目标整理成可以审阅的工作约定，不替你擅自补全未知事实。",
        fields: [
          {
            kind: "choice",
            id: "approach",
            label: "优先从哪里开始",
            options: [
              { value: "clarify", label: "梳理目标与范围" },
              { value: "evidence", label: "核查资料与证据" },
              { value: "plan", label: "整理可执行方案" },
            ],
          },
          {
            kind: "toggle",
            id: "askOnDecisions",
            label: "重要决定先由我确认",
            description: "对范围、费用与外部副作用不做默许推断。",
          },
        ],
        note: "当前仅整理演示草稿，材料和可执行能力尚未得到验证。",
      },
      {
        description: "持续工作不等于反复提醒；先选择检查节奏，再决定何时打扰。",
        fields: [
          {
            kind: "choice",
            id: "frequency",
            label: "检查频率",
            options: [
              { value: "1h", label: "每小时" },
              { value: "24h", label: "每天" },
              { value: "weekly", label: "每周" },
            ],
          },
          {
            kind: "toggle",
            id: "importantOnly",
            label: "仅有重要变化时通知",
            description: "没有值得报告的发现时保持安静。",
          },
        ],
        note: "这是计划偏好的示例控件，没有创建真实定时任务。",
      },
      {
        description: "明确你要收到什么，以及哪些行为必须获得单独许可。",
        fields: [
          {
            kind: "choice",
            id: "deliverable",
            label: "期望成果",
            options: [
              { value: "summary", label: "要点摘要" },
              { value: "plan", label: "行动方案" },
              { value: "report", label: "完整报告" },
            ],
          },
          {
            kind: "toggle",
            id: "externalActions",
            label: "涉及对外操作",
            description: "本开关不构成授权；真实操作仍需逐项明确批准。",
          },
        ],
        note: "任务不会在此原型中提交、发送、扣费或启动。",
      },
    ],
  },
  radar: {
    id: "radar",
    label: "行业动态",
    title: "持续关注 AI 行业的变化",
    tagline: "把变化留给 Mira，把重要判断留给你。",
    intent: "持续追踪 AI 产品、开源与独立开发者，只告诉我真正重要的变化。",
    text: "请持续观察 AI 行业的新产品、模型进展和独立开发者机会。优先选择一手资料，区分事实与判断。遇到值得我注意的变化，说明为什么重要；没有值得报告的发现，就保留记录，不必打扰我。",
    initialConfig: {
      focus: "products",
      makers: true,
      frequency: "1h",
      importantOnly: true,
      digest: "weekly",
      externalActions: false,
    },
    stages: ["研究目标", "工作节奏", "交付与边界"],
    sections: [
      {
        description: "Mira 先确认什么值得被发现，再把材料组织成可以回看的研究。",
        fields: [
          {
            kind: "choice",
            id: "focus",
            label: "关注重点",
            options: [
              { value: "products", label: "模型、产品与开源工具" },
              { value: "business", label: "创业与商业化机会" },
              { value: "research", label: "基础研究与论文" },
            ],
          },
          {
            kind: "toggle",
            id: "makers",
            label: "关注独立开发者",
            description: "优先保留真实用户、收入或失败的证据。",
          },
        ],
        note: "材料来源和可访问权限将在正式委托时再次确认。",
      },
      {
        description: "检查是为了发现变化，不等于每次都给你发一条消息。",
        fields: [
          {
            kind: "choice",
            id: "frequency",
            label: "检查频率",
            options: [
              { value: "1h", label: "每小时一次" },
              { value: "6h", label: "每 6 小时" },
              { value: "24h", label: "每天一次" },
            ],
          },
          {
            kind: "toggle",
            id: "importantOnly",
            label: "仅在有重点时通知",
            description: "无重大进展时安静运行，保留执行记录。",
          },
        ],
        note: "原型只展示规则；尚未连接真实调度与通知。",
      },
      {
        description: "确定交付的形态，也明确哪些事情不能擅自代你做。",
        fields: [
          {
            kind: "choice",
            id: "digest",
            label: "阶段成果",
            options: [
              { value: "weekly", label: "每周整理一次研究摘要" },
              { value: "milestone", label: "重要发现形成专题" },
              { value: "monthly", label: "每月形成一份报告" },
            ],
          },
          {
            kind: "toggle",
            id: "externalActions",
            label: "允许向外部主动发布",
            description: "此项仅作方案展示；不会执行发送或发布。",
          },
        ],
        note: "真正的授权、预算与期限需要真实服务校验；本页不发起委托。",
      },
    ],
  },
  journey: {
    id: "journey",
    label: "旅行规划",
    title: "准备一段有余地的旅行",
    tagline: "不急着塞满行程，先弄清你想怎样度过。",
    intent: "帮我规划一次节奏从容的旅行，优先文化、街区和当地生活。",
    text: "我希望旅行不只是景点打卡。请把交通与住宿区域组织清楚，保留自由探索的时间。适当选择展馆、书店和街区，不要为了效率把每天排得满满当当。",
    initialConfig: {
      destination: "kyoto",
      slowPace: true,
      transit: "rail",
      localCulture: true,
      format: "day",
      booking: false,
    },
    stages: ["旅行意图", "路线与偏好", "交付与边界"],
    sections: [
      {
        description: "从旅行气质和目的地开始，而不是先弹出十几个筛选条件。",
        fields: [
          {
            kind: "choice",
            id: "destination",
            label: "目的地",
            options: [
              { value: "kyoto", label: "京都及周边" },
              { value: "taipei", label: "台北及周边" },
              { value: "hanoi", label: "河内及周边" },
            ],
          },
          {
            kind: "toggle",
            id: "slowPace",
            label: "保留自由时间",
            description: "宁可少几个地点，也不要连续赶路。",
          },
        ],
        note: "行程内容均为体验演示，不代表真实预订或可用性。",
      },
      {
        description: "把偏好组织成路线，让你看得懂为什么这样安排。",
        fields: [
          {
            kind: "choice",
            id: "transit",
            label: "主要交通方式",
            options: [
              { value: "rail", label: "公共交通与步行" },
              { value: "drive", label: "自驾为主" },
            ],
          },
          {
            kind: "toggle",
            id: "localCulture",
            label: "偏重文化与街区",
            description: "展馆、历史街区、书店和当地生活优先。",
          },
        ],
        note: "路线、地理信息和真实交通时刻仍需后续外部数据验证。",
      },
      {
        description: "我们先交付可审阅的行程方案，预订由你明确决定。",
        fields: [
          {
            kind: "choice",
            id: "format",
            label: "交付方式",
            options: [
              { value: "day", label: "按天阅读的行程" },
              { value: "map", label: "地点与路线清单" },
            ],
          },
          {
            kind: "toggle",
            id: "booking",
            label: "允许代为预订",
            description: "仅演示偏好，不会访问外部预订服务。",
          },
        ],
        note: "实际订票、酒店或支付需要独立授权，不能由生成式控件决定。",
      },
    ],
  },
  venture: {
    id: "venture",
    label: "创业调研",
    title: "研究一个值得验证的生意",
    tagline: "先找证据，再决定要不要下注。",
    intent: "调查一个面向海外市场的小团队产品机会，整理值得行动的证据。",
    text: "从真实用户问题开始，研究替代品、竞争格局和获客方式。优先挖掘能验证的商业信号，也要保留失败案例。最后给出可执行的试验方案，而不是把可能性写成确定性。",
    initialConfig: {
      market: "international",
      includeFailures: true,
      method: "customer",
      revisit: true,
      format: "brief",
      outreach: false,
    },
    stages: ["研究假设", "证据方法", "交付与边界"],
    sections: [
      {
        description: "先把问题定义为一个可证伪的机会，而不是立刻写商业计划书。",
        fields: [
          {
            kind: "choice",
            id: "market",
            label: "研究市场",
            options: [
              { value: "international", label: "跨境与海外用户" },
              { value: "china", label: "中国本地市场" },
              { value: "both", label: "两地对照" },
            ],
          },
          {
            kind: "toggle",
            id: "includeFailures",
            label: "纳入失败案例",
            description: "寻找未解决的用户问题和商业风险。",
          },
        ],
        note: "市场数据须有来源，不能把模型推断当作访谈事实。",
      },
      {
        description: "确认什么样的证据才值得继续投入时间。",
        fields: [
          {
            kind: "choice",
            id: "method",
            label: "优先研究方法",
            options: [
              { value: "customer", label: "用户问题与真实案例" },
              { value: "competitor", label: "竞品与市场格局" },
              { value: "pricing", label: "价格与商业模式" },
            ],
          },
          {
            kind: "toggle",
            id: "revisit",
            label: "持续更新判断",
            description: "新证据出现时修订结论，保留早期版本。",
          },
        ],
        note: "访谈与网站访问在此都只展示研究策略，不会真实执行。",
      },
      {
        description: "结果要能支持决定，而不仅是一份材料拼贴。",
        fields: [
          {
            kind: "choice",
            id: "format",
            label: "成果形态",
            options: [
              { value: "brief", label: "证据导向的投资备忘录" },
              { value: "experiments", label: "小规模验证实验清单" },
            ],
          },
          {
            kind: "toggle",
            id: "outreach",
            label: "允许对外联系用户",
            description: "原型不发送消息，正式委托必须单独确认。",
          },
        ],
        note: "任何对外联系、购买、收费或公开发布必须再次授权。",
      },
    ],
  },
};

export function buildDelegationSpec(
  scenario: DelegationScenario,
  stage: DelegationStage,
  revision: number,
  streamStep: number,
): Spec {
  const section = scenario.sections[stage];
  const elements: Spec["elements"] = {
    root: { type: "Flow", props: { label: section.description }, children: ["intro"] },
    intro: {
      type: "Intro",
      props: {
        title: scenario.stages[stage],
        description:
          streamStep >= 1 || revision > 0
            ? section.description + " Mira 已根据本轮批注调整了表达。"
            : section.description,
      },
      children: [],
    },
  };
  const children = ["intro"];
  for (const field of section.fields) {
    const id = "field-" + field.id;
    children.push(id);
    elements[id] =
      field.kind === "choice"
        ? {
            type: "ChoiceField",
            props: {
              label: field.label,
              options: field.options,
              value: { $bindState: "/config/" + field.id },
            },
            children: [],
          }
        : {
            type: "ToggleField",
            props: {
              label: field.label,
              description: field.description,
              value: { $bindState: "/config/" + field.id },
            },
            children: [],
          };
  }
  children.push("note");
  elements["note"] = {
    type: "Note",
    props: {
      text:
        streamStep >= 2 || revision > 0
          ? "这一版将继续等待你审阅。未提交任何真实任务。"
          : section.note,
    },
    children: [],
  };
  if (streamStep >= 3 || revision > 0) {
    children.push("revision");
    elements["revision"] = {
      type: "Note",
      props: { text: "本轮变化已标记；批注仍须由你确认解决或放弃。" },
      children: [],
    };
  }
  elements["root"] = { type: "Flow", props: { label: section.description }, children };
  return { root: "root", elements };
}

export function delegationSummary(
  scenario: DelegationScenarioId,
  stage: DelegationStage,
  config: Record<string, unknown>,
): string {
  if (scenario === "custom") {
    if (stage === 0)
      return (
        "优先" +
        (config["approach"] === "evidence"
          ? "核查资料与证据"
          : config["approach"] === "plan"
            ? "整理可执行方案"
            : "梳理目标与范围") +
        (config["askOnDecisions"] ? "；重要决定需要你确认。" : "；不替你授权外部行为。")
      );
    if (stage === 1)
      return (
        "按" +
        (config["frequency"] === "1h"
          ? "每小时"
          : config["frequency"] === "weekly"
            ? "每周"
            : "每天") +
        "检查；" +
        (config["importantOnly"] ? "仅有重点时通知。" : "按约定整理进展。")
      );
    return (
      "交付" +
      (config["deliverable"] === "plan"
        ? "行动方案"
        : config["deliverable"] === "report"
          ? "完整报告"
          : "要点摘要") +
      "；" +
      (config["externalActions"] ? "所有对外操作仍需单独确认。" : "不主动执行对外操作。")
    );
  }
  if (scenario === "radar") {
    if (stage === 0)
      return (
        "研究重点：" +
        (config["focus"] === "business"
          ? "创业与商业化"
          : config["focus"] === "research"
            ? "基础研究"
            : "模型、产品与开源") +
        (config["makers"] ? "，同时关注独立开发者。" : "。")
      );
    if (stage === 1)
      return (
        "按" +
        (config["frequency"] === "6h"
          ? "每 6 小时"
          : config["frequency"] === "24h"
            ? "每天"
            : "每小时") +
        "检查，" +
        (config["importantOnly"] ? "只有重要变化才通知你。" : "按所选策略报告检查结果。")
      );
    return (
      "交付形式：" +
      (config["digest"] === "milestone"
        ? "重要发现专题"
        : config["digest"] === "monthly"
          ? "月度报告"
          : "每周研究摘要") +
      "。外部发布" +
      (config["externalActions"] ? "需要明确授权。" : "不在委托范围内。")
    );
  }
  if (scenario === "journey") {
    if (stage === 0)
      return (
        "目的地：" +
        (config["destination"] === "taipei"
          ? "台北"
          : config["destination"] === "hanoi"
            ? "河内"
            : "京都") +
        (config["slowPace"] ? "，保留探索与休息的余地。" : "，适度提高行程密度。")
      );
    if (stage === 1)
      return (
        "交通以" +
        (config["transit"] === "drive" ? "自驾" : "公共交通和步行") +
        "为主，" +
        (config["localCulture"] ? "偏重街区与文化。" : "兼顾经典景点。")
      );
    return (
      "形成" +
      (config["format"] === "map" ? "地点路线清单" : "按天阅读的行程") +
      "；" +
      (config["booking"] ? "预订动作需要另行确认。" : "不自动预订。")
    );
  }
  if (stage === 0)
    return (
      "研究范围：" +
      (config["market"] === "china"
        ? "中国本地"
        : config["market"] === "both"
          ? "国内外对照"
          : "海外市场") +
      (config["includeFailures"] ? "，保留失败证据。" : "。")
    );
  if (stage === 1)
    return (
      "优先核查" +
      (config["method"] === "competitor"
        ? "竞争格局"
        : config["method"] === "pricing"
          ? "价格与商业模式"
          : "真实用户问题") +
      (config["revisit"] ? "，持续修订判断。" : "。")
    );
  return (
    "交付" +
    (config["format"] === "experiments" ? "验证实验清单" : "证据导向备忘录") +
    "；" +
    (config["outreach"] ? "对外联系需另行授权。" : "不主动联系外部对象。")
  );
}
