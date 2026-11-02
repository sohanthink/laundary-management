import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Photo } from "@/components/photo";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/layout";
import { updateProduct } from "@/server/modules/products/actions";
import { getCategories, getProduct } from "@/server/modules/products/queries";
import { ProductFields } from "../product-fields";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), getCategories()]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description="Changing the base price does not change prices already agreed with hotels."
        actions={<LinkButton href="/admin/products">Back</LinkButton>}
      />
      <Card className="max-w-xl">
        <div className="mb-5 flex items-center gap-4">
          <Photo path={product.photoPath} alt={product.name} size={72} />
          <p className="text-sm text-(--muted)">Upload a new photo below to replace this one.</p>
        </div>
        <ActionForm action={updateProduct} submitLabel="Save changes" resetOnSuccess={false}>
          <input type="hidden" name="id" value={product.id} />
          <ProductFields categories={categories} product={product} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4 accent-(--teal)" />
            Active (inactive products can&apos;t be added to new deals or sends)
          </label>
        </ActionForm>
      </Card>
    </>
  );
}
