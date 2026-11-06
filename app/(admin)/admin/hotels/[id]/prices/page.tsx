import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/link-button";
import { Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { formatDate } from "@/server/dates";
import { formatMoney, toMoneyInput } from "@/server/money";
import { removeHotelPrice, setHotelPrice } from "@/server/modules/prices/actions";
import { getHotelPricePage } from "@/server/modules/prices/queries";
import { describeDiscount } from "@/server/pricing";
import { DiscountFields } from "./discount-fields";
import { ServicePricesCard } from "./service-prices";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Agreed prices") };
}

export default async function HotelPricesPage({ params }: PageProps<"/admin/hotels/[id]/prices">) {
  const t = await getT();
  const { id } = await params;
  const { hotel, prices, addable, history } = await getHotelPricePage(id);
  if (!hotel) notFound();

  return (
    <>
      <PageHeader
        title={`${hotel.name}: ${t("agreed prices")}`}
        description="Only these products appear on the Send screen for this hotel. Changing a price never changes past sends."
        actions={
          <>
            <LinkButton href={`/admin/send?hotel=${hotel.id}`} variant="primary">
              Send to this hotel
            </LinkButton>
            <LinkButton href={`/admin/hotels/${hotel.id}`}>Hotel profile</LinkButton>
          </>
        }
      />

      <div className="space-y-6">
        <Card title="Add a product to the deal">
          {addable.length === 0 ? (
            <Empty>All active products are already in this deal.</Empty>
          ) : (
            <ActionForm action={setHotelPrice} submitLabel="Add to deal">
              <input type="hidden" name="hotelId" value={hotel.id} />
              <DiscountFields key={addable.map((p) => p.id).join()} products={addable} />
            </ActionForm>
          )}
        </Card>

        <Card title="Current deal">
          {prices.length === 0 ? (
            <Empty>No products agreed yet.</Empty>
          ) : (
            <div className="space-y-3">
              {prices.map((price) => (
                <div key={price.id} className="rounded-2xl border border-(--line) p-4">
                  <ActionForm action={setHotelPrice} submitLabel="Update" resetOnSuccess={false} className="space-y-3">
                    <input type="hidden" name="hotelId" value={hotel.id} />
                    <DiscountFields
                      product={{ id: price.product.id, name: price.product.name, basePrice: price.product.basePrice }}
                      defaultType={price.discountType}
                      defaultValue={price.discountType === "NONE" ? "" : toMoneyInput(price.discountValue)}
                    />
                    <p className="text-xs text-(--muted)">
                      {t("Agreed {price} since {date}", { price: formatMoney(price.agreedPrice), date: formatDate(price.validFrom) })}
                    </p>
                  </ActionForm>
                  <div className="mt-2 flex justify-end">
                    <ActionForm
                      action={removeHotelPrice}
                      submitLabel="Remove from deal"
                      submitVariant="danger"
                      confirm={`Remove ${price.product.name} from ${hotel.name}'s deal?`}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="hotelId" value={hotel.id} />
                      <input type="hidden" name="productId" value={price.productId} />
                    </ActionForm>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <ServicePricesCard hotelId={hotel.id} />

        {history.length > 0 && (
          <Card title="Price history">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Discount</Th>
                  <Th align="right">Agreed price</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <Td>{h.product.name}</Td>
                    <Td>{describeDiscount(h.discountType, h.discountValue, t)}</Td>
                    <Td align="right">{formatMoney(h.agreedPrice)}</Td>
                    <Td>{formatDate(h.validFrom)}</Td>
                    <Td>{h.validTo ? formatDate(h.validTo) : "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
