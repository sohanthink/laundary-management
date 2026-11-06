"use client";

import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useT();
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {t("Print")}
    </Button>
  );
}
