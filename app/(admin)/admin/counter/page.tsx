import type { Metadata } from "next";
import { ClientOnly } from "@/components/pos/client-only";
import { LinkButton } from "@/components/ui/link-button";
import { getT } from "@/server/i18n";
import { getCounterScreen } from "@/server/modules/counter/queries";
import { CounterPos } from "./counter-pos";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Counter") };
}

export default async function CounterPage({ searchParams }: PageProps<"/admin/counter">) {
  const t = await getT();
  const { phone } = await searchParams;
  const { items } = await getCounterScreen(typeof phone === "string" ? phone : undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl tracking-tight text-(--ink)">{t("Counter (walk-in customers)")}</h1>
        <div className="flex gap-2">
          <LinkButton href="/admin/counter/customers">Walk-in customers</LinkButton>
          <LinkButton href="/admin/counter/prices">Counter prices</LinkButton>
        </div>
      </div>
      <ClientOnly>
        <CounterPos
          items={items.map((i) => ({ id: i.id, name: i.name, washIronPrice: i.washIronPrice }))}
          initialPhone={typeof phone === "string" ? phone : undefined}
        />
      </ClientOnly>
    </div>
  );
}
