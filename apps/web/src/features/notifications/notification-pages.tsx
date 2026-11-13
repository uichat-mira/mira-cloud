import type { ReactNode } from "react";
import { Bell, Send } from "lucide-react";

import { Result } from "../../components/mira-design/index.ts";

function EmptyNotificationPage({
  heading,
  icon,
  title,
  description,
}: {
  heading: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[min(64dvh,560px)] w-full items-center justify-center">
      <h1 className="sr-only">{heading}</h1>
      <Result size="lg" title={title} description={description} icon={icon} />
    </div>
  );
}

export function NotificationsInboxPage() {
  return (
    <EmptyNotificationPage
      heading="消息中心"
      icon={<Bell size={24} aria-hidden="true" />}
      title="消息尚未接入"
      description="当前未连接云端通知服务，无法展示真实消息或未读状态。"
    />
  );
}

export function NotificationDeliveriesPage() {
  return (
    <EmptyNotificationPage
      heading="送达记录"
      icon={<Send size={24} aria-hidden="true" />}
      title="尚未接通送达记录"
      description="暂无可核验的推送记录。任务执行完成不等于消息已送达。"
    />
  );
}
