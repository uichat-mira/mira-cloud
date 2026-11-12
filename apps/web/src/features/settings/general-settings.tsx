import { useState } from "react";
import { MonitorCog, Moon, Palette } from "lucide-react";
import { Select, Switch } from "../../components/mira-design/index.ts";
import {
  presetIds,
  themePresetMap,
  type ThemePresetId,
} from "../../theme/mira-design/index.ts";
import {
  applyTheme,
  currentTheme,
  type ThemePreference,
} from "../../theme/mira-design/theme-preference.ts";

const presetOptions = presetIds.map((preset) => ({
  value: preset,
  label: themePresetMap[preset]?.label ?? preset,
}));

export function GeneralSettingsPage() {
  const [theme, setTheme] = useState<ThemePreference>(currentTheme);

  const changeTheme = (next: ThemePreference) => {
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-8 border-b border-border pb-5">
        <p className="mb-1 text-xs font-medium text-text-tertiary">设置</p>
        <h1 className="text-heading-1 font-semibold text-text-primary">通用</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          管理 Mira Cloud 的本地视觉偏好。这些设置只影响当前浏览器，不代表账号或其它运行时已经同步。
        </p>
      </header>

      <section aria-labelledby="appearance-settings-title" className="space-y-1">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-ui-control bg-surface-secondary text-icon-secondary">
            <Palette size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 id="appearance-settings-title" className="text-sm font-semibold text-text-primary">
              外观
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-tertiary">
              继续使用 MiraDesign 的主题预设与明暗模式，不创建第二套配色。
            </p>
          </div>
        </div>

        <div className="divide-y divide-border border-y border-border">
          <div className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <MonitorCog size={15} aria-hidden="true" />
                主题预设
              </div>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">
                选择 Mira Desktop 设计资产映射出的 Cloud 主题。
              </p>
            </div>
            <Select
              value={theme.preset}
              onChange={(value) => {
                if (presetIds.some((preset) => preset === value)) {
                  changeTheme({ ...theme, preset: value as ThemePresetId });
                }
              }}
              options={presetOptions}
              compact
            />
          </div>

          <div className="flex min-h-20 items-center justify-between gap-6 py-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Moon size={15} aria-hidden="true" />
                深色模式
              </div>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">
                当前为{theme.appearance === "dark" ? "深色" : "浅色"}外观。
              </p>
            </div>
            <Switch
              checked={theme.appearance === "dark"}
              onChange={() =>
                changeTheme({
                  ...theme,
                  appearance: theme.appearance === "dark" ? "light" : "dark",
                })
              }
              ariaLabel="深色模式"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
