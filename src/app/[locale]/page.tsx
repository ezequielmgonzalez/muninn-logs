import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Muninn Logs</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
      <Button>{t("logGame")}</Button>
      <LocaleSwitcher />
    </main>
  );
}
