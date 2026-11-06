import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/link-button";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/server/money";
import { createProduct } from "@/server/modules/products/actions";
import { getCategories, getProductsWithTracking } from "@/server/modules/products/queries";
import { ProductFields } from "./product-fields";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Products") };
}

export default async function ProductsPage() {
  const [rows, categories] = await Promise.all([getProductsWithTracking(), getCategories()]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Your linen catalog with base prices. Each hotel gets its own agreed price."
        actions={
          <>
            <LinkButton href="/admin/products/categories">Categories</LinkButton>
            {categories.length > 0 && (
              <Modal trigger="New product" title="New product">
                <ActionForm action={createProduct} submitLabel="Create product">
                  <ProductFields categories={categories} />
                </ActionForm>
              </Modal>
            )}
          </>
        }
      />

      <Card>
        {categories.length === 0 ? (
          <Empty>
            Start by creating a category such as &quot;Bedding&quot; or &quot;Towels&quot; on the{" "}
            <Link className="text-(--teal) underline" href="/admin/products/categories">
              categories page
            </Link>
            .
          </Empty>
        ) : rows.length === 0 ? (
          <Empty>No products yet. Click &quot;New product&quot; to add your first one.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th align="right">Base price</Th>
                <Th align="right">At hotels now</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ product, atHotels }) => (
                <tr key={product.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Photo path={product.photoPath} alt={product.name} />
                      <span className="font-medium">{product.name}</span>
                      {!product.isActive && <Badge>Inactive</Badge>}
                    </div>
                  </Td>
                  <Td>{product.category.name}</Td>
                  <Td align="right">{formatMoney(product.basePrice)}</Td>
                  <Td align="right" className="font-semibold">
                    {atHotels}
                  </Td>
                  <Td align="right">
                    <LinkButton href={`/admin/products/${product.id}`} size="sm" variant="ghost">
                      Edit
                    </LinkButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
