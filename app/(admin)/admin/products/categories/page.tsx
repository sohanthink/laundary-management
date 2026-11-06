import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/link-button";
import { Input, TextField } from "@/components/ui/field";
import { Card, Empty, PageHeader } from "@/components/ui/layout";
import { createCategory, renameCategory } from "@/server/modules/products/actions";
import { getCategories } from "@/server/modules/products/queries";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Categories") };
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group your products, for example Bedding, Towels, Kitchen."
        actions={<LinkButton href="/admin/products">Back to products</LinkButton>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="All categories">
          {categories.length === 0 ? (
            <Empty>No categories yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {categories.map((category) => (
                <li key={category.id} className="rounded-2xl border border-(--line) p-3">
                  <ActionForm
                    action={renameCategory}
                    submitLabel="Rename"
                    resetOnSuccess={false}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <input type="hidden" name="id" value={category.id} />
                    <Input name="name" defaultValue={category.name} className="max-w-xs" required />
                    <span className="text-sm text-(--muted)">
                      {category._count.products} products
                    </span>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="New category">
          <ActionForm action={createCategory} submitLabel="Create">
            <TextField label="Name" name="name" placeholder="Bedding" required />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
