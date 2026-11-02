import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Select, TextField } from "@/components/ui/field";
import { Badge, Card, Empty, PageHeader, Stat, Table, Td, Th } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/server/dates";
import { MOVEMENT_LABEL, STATE_LABEL } from "@/server/labels";
import { addStock, markWashed, writeOff } from "@/server/modules/stock/actions";
import {
  getActiveHotelOptions,
  getRecentMovements,
  getStockSummary,
} from "@/server/modules/stock/queries";

export const metadata: Metadata = { title: "Stock" };

function ProductSelect({ products }: { products: { id: string; label: string }[] }) {
  return (
    <Field label="Product" name="productId">
      <Select name="productId" defaultValue="" required>
        <option value="" disabled>
          Choose a product
        </option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export default async function StockPage() {
  const [rows, movements, hotels] = await Promise.all([
    getStockSummary(),
    getRecentMovements(),
    getActiveHotelOptions(),
  ]);

  const totals = rows.reduce(
    (acc, r) => ({
      available: acc.available + r.buckets.AVAILABLE,
      atHotel: acc.atHotel + r.buckets.AT_HOTEL,
      washing: acc.washing + r.buckets.WASHING,
      writtenOff: acc.writtenOff + r.buckets.WRITTEN_OFF,
    }),
    { available: 0, atHotel: 0, washing: 0, writtenOff: 0 },
  );

  const allProducts = rows.map((r) => ({ id: r.product.id, label: r.product.name }));
  const washingProducts = rows
    .filter((r) => r.buckets.WASHING > 0)
    .map((r) => ({ id: r.product.id, label: `${r.product.name} (${r.buckets.WASHING} washing)` }));

  return (
    <>
      <PageHeader
        title="Stock"
        description="Where every piece is right now. Total owned = available + at hotels + washing."
        actions={
          <>
            <Modal trigger="Add stock" title="Add stock" description="New pieces you bought.">
              <ActionForm action={addStock} submitLabel="Add to stock">
                <ProductSelect products={allProducts} />
                <TextField label="Quantity" name="quantity" type="number" min={1} required />
                <TextField label="Note" name="note" placeholder="Bought from ..." />
              </ActionForm>
            </Modal>
            <Modal
              trigger="Mark washed"
              title="Mark washed"
              triggerVariant="secondary"
              description="Washed pieces become available to send again."
            >
              {washingProducts.length === 0 ? (
                <Empty>Nothing is in washing right now.</Empty>
              ) : (
                <ActionForm action={markWashed} submitLabel="Mark washed">
                  <ProductSelect products={washingProducts} />
                  <TextField label="Quantity" name="quantity" type="number" min={1} required />
                </ActionForm>
              )}
            </Modal>
            <Modal
              trigger="Lost / damaged"
              title="Write off lost or damaged pieces"
              triggerVariant="secondary"
              description="Removes pieces from your stock. Hotels are not charged."
            >
              <ActionForm action={writeOff} submitLabel="Write off" submitVariant="danger">
                <ProductSelect products={allProducts} />
                <Field label="Reason" name="type">
                  <Select name="type" defaultValue="LOST">
                    <option value="LOST">Lost</option>
                    <option value="DAMAGED">Damaged</option>
                  </Select>
                </Field>
                <Field label="Where was it?" name="fromState">
                  <Select name="fromState" defaultValue="AT_HOTEL">
                    <option value="AT_HOTEL">At a hotel</option>
                    <option value="WASHING">In washing</option>
                    <option value="AVAILABLE">In store (available)</option>
                  </Select>
                </Field>
                <Field label="Hotel" name="hotelId" hint="Only needed when it was at a hotel">
                  <Select name="hotelId" defaultValue="">
                    <option value="">-</option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <TextField label="Quantity" name="quantity" type="number" min={1} required />
                <TextField label="Note" name="note" placeholder="Torn during washing" />
              </ActionForm>
            </Modal>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Available" value={totals.available} />
        <Stat label="At hotels" value={totals.atHotel} />
        <Stat label="Washing" value={totals.washing} />
        <Stat label="Written off" value={totals.writtenOff} tone="warn" />
      </div>

      <Card title="By product" className="mb-6">
        {rows.length === 0 ? (
          <Empty>Add products first.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th align="right">Available</Th>
                <Th align="right">At hotels</Th>
                <Th align="right">Washing</Th>
                <Th align="right">Written off</Th>
                <Th align="right">Total owned</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ product, buckets, owned }) => (
                <tr key={product.id}>
                  <Td className="font-medium">{product.name}</Td>
                  <Td align="right">{buckets.AVAILABLE}</Td>
                  <Td align="right">{buckets.AT_HOTEL}</Td>
                  <Td align="right">{buckets.WASHING}</Td>
                  <Td align="right">{buckets.WRITTEN_OFF}</Td>
                  <Td align="right" className="font-semibold">
                    {owned}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Recent movements">
        {movements.length === 0 ? (
          <Empty>No stock movements yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Type</Th>
                <Th>Product</Th>
                <Th>Hotel</Th>
                <Th>From / to</Th>
                <Th align="right">Qty</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap text-(--muted)">{formatDateTime(m.createdAt)}</Td>
                  <Td>
                    <Badge tone={m.type === "LOST" || m.type === "DAMAGED" ? "bad" : "default"}>
                      {MOVEMENT_LABEL[m.type]}
                    </Badge>
                  </Td>
                  <Td>{m.product.name}</Td>
                  <Td>{m.hotel?.name ?? "-"}</Td>
                  <Td className="text-(--muted)">
                    {STATE_LABEL[m.fromState]} → {STATE_LABEL[m.toState]}
                  </Td>
                  <Td align="right">{m.quantity}</Td>
                  <Td className="text-(--muted)">{m.note ?? ""}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
