export const MIRA_LOGO_URL = "https://assets.tomz.io/images/mira-logo.png";

export interface MiraBrandLogoProps {
  className?: string;
}

export function MiraBrandLogo({ className = "" }: MiraBrandLogoProps) {
  return (
    <img
      src={MIRA_LOGO_URL}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={["workspace-brand-logo", className].filter(Boolean).join(" ")}
    />
  );
}
