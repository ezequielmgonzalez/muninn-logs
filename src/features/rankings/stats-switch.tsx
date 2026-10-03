import { getTranslations } from "next-intl/server";

import { TurnLink } from "@/components/notebook/page-turn";
import { PenCircle } from "@/components/notebook/pen-circle";

/**
 * Phones only: "Tus números · Rankings" at the top of both screens, since the
 * tab bar has no room for Rankings. Each is a link; the current one is circled.
 */
export async function StatsSwitch({ current }: { current: "stats" | "rankings" }) {
  const t = await getTranslations("Rankings.switch");
  const options = [
    { key: "stats", href: "/profile", label: t("stats") },
    { key: "rankings", href: "/rankings", label: t("rankings") },
  ] as const;
  return (
    <nav aria-label={t("label")} className="flex justify-center gap-8 notebook:hidden">
      {options.map(({ key, href, label }) => (
        <TurnLink
          key={key}
          href={href}
          section={key}
          direction={key === "rankings" ? "forward" : "backward"}
          aria-current={key === current ? "page" : undefined}
          className="relative flex min-h-11 items-center px-4 text-base text-ink-body outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze aria-[current=page]:font-semibold aria-[current=page]:text-ink"
        >
          {key === current && <PenCircle className="-inset-x-0.5 -inset-y-0.5" />}
          {label}
        </TurnLink>
      ))}
    </nav>
  );
}
