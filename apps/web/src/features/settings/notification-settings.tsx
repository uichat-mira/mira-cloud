import { BellRing } from "lucide-react";

export function NotificationSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-9">
        <p className="mb-2 text-xs text-text-tertiary">设置</p>
        <h1 className="text-heading-1 font-semibold text-text-primary">通知与送达</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          管理全局消息偏好和授权渠道，不覆盖单项工作的触发与报告条件。
        </p>
      </header>
      <section aria-label="通知偏好" className="flex items-start gap-4 border-t border-border py-8">
        <BellRing size={20} className="mt-1 shrink-0 text-icon-secondary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-text-primary">渠道配置尚未开放</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            尚未接入通知授权与送达服务，因此暂不提供无法生效的开关。
          </p>
        </div>
      </section>
    </div>
  );
}
