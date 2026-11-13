import { BellRing } from "lucide-react";

import { Result } from "../../components/mira-design/index.ts";

export function NotificationSettingsPage() {
  return (
    <div className="workspace-page-body flex min-h-[min(64dvh,560px)] items-center justify-center">
      <h1 className="sr-only">通知与送达</h1>
      <Result
        size="lg"
        title="渠道配置尚未开放"
        description="尚未接入通知授权与送达服务，暂时无法配置推送渠道。"
        icon={<BellRing size={24} aria-hidden="true" />}
      />
    </div>
  );
}
