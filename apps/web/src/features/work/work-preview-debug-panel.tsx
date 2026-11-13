import { previewScenarios, type PreviewScenario } from "./fixture-data";

interface WorkPreviewDebugPanelProps {
  scenario: PreviewScenario;
  onChange: (next: PreviewScenario) => void;
  onClose: () => void;
}

export default function WorkPreviewDebugPanel({
  scenario,
  onChange,
  onClose,
}: WorkPreviewDebugPanelProps) {
  return (
    <>
      <div className="preview-debug-group" role="group" aria-label="选择原型情境">
        <span className="preview-debug-group-label">预览情境</span>
        <div className="preview-debug-choice-list">
          {previewScenarios.map((item) => (
            <button
              key={item.value}
              type="button"
              className="preview-debug-choice"
              aria-pressed={scenario === item.value}
              onClick={() => {
                onChange(item.value);
                onClose();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="preview-debug-help">
        仅切换前端 Fixture，不会调用真实工作接口，也不会发起执行。
      </p>
    </>
  );
}
