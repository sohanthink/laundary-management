import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { formatTk } from "@/server/money";
import { createProduct } from "@/server/modules/products/actions";
import { getCategories } from "@/server/modules/products/queries";
import { getStockSummary } from "@/server/modules/stock/queries";
import { ProductFields } from "./product-fields";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const [rows, categories] = await Promise.all([getStockSummary(), getCategories()]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Your linen catalog with base prices and live stock."
        actions={
          <>
            <LinkButton href="/admin/products/categories">Categories</LinkButton>
            {categories.length > 0 && (
              <Modal trigger="New product" title="New product">
                <ActionForm action={createProduct} submitLabel="Create product">
                  <ProductFields categories={categories} showInitialStock />
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
                <Th align="right">Available</Th>
                <Th align="right">At hotels</Th>
                <Th align="right">Washing</Th>
                <Th align="right">Owned</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ product, buckets, owned }) => (
                <tr key={product.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Photo path={product.photoPath} alt={product.name} />
                      <span className="font-medium">{product.name}</span>
                      {!product.isActive && <Badge>Inactive</Badge>}
                    </div>
                  </Td>
                  <Td>{product.category.name}</Td>
                  <Td align="right">{formatTk(product.basePrice)}</Td>
                  <Td align="right">{buckets.AVAILABLE}</Td>
                  <Td align="right">{buckets.AT_HOTEL}</Td>
                  <Td align="right">{buckets.WASHING}</Td>
                  <Td align="right" className="font-semibold">
                    {owned}
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
