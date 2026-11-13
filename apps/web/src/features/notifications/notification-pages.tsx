import { Bell, Send } from "lucide-react";
import { Link } from "react-router";

function PageHeading({ title, summary }: { title: string; summary: string }) {
  return (
    <header className="mb-9">
      <p className="mb-2 text-xs text-text-tertiary">消息中心</p>
      <h1 className="text-heading-1 font-semibold text-text-primary">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{summary}</p>
    </header>
  );
}

export function NotificationsInboxPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading title="消息中心" summary="接收工作提醒、重要发现和需要关注的通知。" />
      <section aria-label="消息列表" className="border-t border-border py-12 text-center">
        <Bell size={24} className="mx-auto mb-4 text-icon-secondary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text-primary">消息尚未接入</h2>
        <p className="mt-2 text-sm text-text-secondary">
          当前未连接云端通知服务，无法展示真实消息或未读状态。
        </p>
        <Link
          to="/notifications/deliveries"
          className="mt-5 inline-block text-sm text-text-secondary underline underline-offset-4"
        >
          查看送达记录入口
        </Link>
      </section>
    </div>
  );
}

export function NotificationDeliveriesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading title="送达记录" summary="追溯每次消息推送的送达状态与失败原因。" />
      <section aria-label="送达记录列表" className="border-t border-border py-12 text-center">
        <Send size={24} className="mx-auto mb-4 text-icon-secondary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text-primary">尚未接通送达记录</h2>
        <p className="mt-2 text-sm text-text-secondary">
          暂无可核验的推送记录。任务执行完成不等于消息已送达。
        </p>
      </section>
    </div>
  );
}
