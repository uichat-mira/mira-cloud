import { ArrowRight, CornerUpLeft, LoaderCircle, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { delegationScenarios, type DelegationScenarioId } from "./delegation-fixtures";

interface DelegationIntentEntryProps {
  phase: "entry" | "drafting" | "error";
  onStart: (scenario: DelegationScenarioId, intent: string) => void;
  onCancel: () => void;
  exampleArtifact?: { title: string; version: string } | undefined;
}

/** D02's beginning: users describe an outcome, not a scheduler or permission form. */
export default function DelegationIntentEntry({
  phase,
  onStart,
  onCancel,
  exampleArtifact,
}: DelegationIntentEntryProps) {
  const [intent, setIntent] = useState("");
  const busy = phase === "drafting";
  const valid = intent.trim().length >= 2 && intent.length <= 500;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy && valid) onStart("custom", intent.trim());
  };

  return (
    <div className="delegation-entry" aria-label="交代工作起点">
      <div className="delegation-entry-content">
        <span className="delegation-entry-kicker">
          <Sparkles size={15} aria-hidden="true" />
          一件新的工作
        </span>
        <h1>有什么事，想交给 Mira？</h1>
        <p className="delegation-entry-description">
          先说你希望发生什么。目标、节奏和交付方式，我们再一起理清。
        </p>
        <form className="delegation-entry-form" onSubmit={submit}>
          <label htmlFor="delegation-intent-input">你希望 Mira 做什么？</label>
          <textarea
            id="delegation-intent-input"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="例如：帮我长期留意独立开发者的新产品，发现值得研究的机会再告诉我……"
            maxLength={500}
            rows={4}
            disabled={busy}
          />
          <div className="delegation-entry-form-footer">
            <span>不必先填写计划、工具或运行规则。</span>
            <button type="submit" className="delegation-accept" disabled={!valid || busy}>
              整理需求草稿 <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
        {busy ? (
          <div className="delegation-entry-progress" role="status" aria-live="polite">
            <LoaderCircle size={16} className="delegation-entry-spinner" aria-hidden="true" />
            <span>正在整理演示草稿</span>
            <button type="button" onClick={onCancel}>
              取消
            </button>
          </div>
        ) : null}
        {phase === "error" ? (
          <p className="delegation-entry-error" role="alert">
            这个浏览器未能保存草稿。输入内容仍在，你可以检查浏览器存储设置后重试。
          </p>
        ) : null}
        {exampleArtifact ? (
          <div className="delegation-entry-context">
            <span>从刚才的成果继续 · 演示引用</span>
            <strong>{exampleArtifact.title}</strong>
            <p>当前只引用演示成果的标题和版本，不读取文件正文或继承执行权限。</p>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onStart(
                  "custom",
                  `基于示例成果「${exampleArtifact.title}」（${exampleArtifact.version}），继续梳理下一步需要核实的问题与可执行方案。`,
                )
              }
            >
              以此起稿 <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div className="delegation-entry-examples">
          <span>也可以先体验一种示例工作</span>
          <div>
            {(["radar", "journey", "venture"] as const).map((id) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => onStart(id, delegationScenarios[id].intent)}
              >
                {delegationScenarios[id].label} <ArrowRight size={13} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="delegation-entry-disclaimer">
        <CornerUpLeft size={13} aria-hidden="true" />
        这一步仅演示需求起稿与审阅流程，不调用真实 AI，也不会创建或执行任务。
      </p>
    </div>
  );
}
