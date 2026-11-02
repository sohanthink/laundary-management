import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "@/components/photo";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/server/dates";
import { formatTk } from "@/server/money";
import {
  createHotel,
  resetOwnerPassword,
  setCustomerLogin,
  updateCustomer,
} from "@/server/modules/customers/actions";
import { getCustomer } from "@/server/modules/customers/queries";
import { CustomerFields, HotelFields } from "../fields";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const totalDue = customer.hotels.reduce((sum, h) => sum + h.due, 0);

  return (
    <>
      <PageHeader
        title={customer.user.name}
        description={`${customer.user.email} · ${customer.phone}`}
        actions={
          <>
            <LinkButton href={`/admin/audit/customers/${customer.id}`}>Audit</LinkButton>
            <LinkButton href="/admin/customers">Back</LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card
            title={`Hotels · total due ${formatTk(totalDue)}`}
            actions={
              <Modal trigger="Add hotel" title="Add hotel" triggerSize="sm">
                <ActionForm action={createHotel} submitLabel="Add hotel">
                  <input type="hidden" name="customerId" value={customer.id} />
                  <HotelFields />
                </ActionForm>
              </Modal>
            }
          >
            {customer.hotels.length === 0 ? (
              <Empty>No hotels yet. Add the first hotel for this customer.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Hotel</Th>
                    <Th>Location</Th>
                    <Th align="right">Due</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {customer.hotels.map((h) => (
                    <tr key={h.id}>
                      <Td>
                        <Link href={`/admin/hotels/${h.id}`} className="font-medium hover:text-(--teal)">
                          {h.name}
                        </Link>{" "}
                        {!h.isActive && <Badge>Inactive</Badge>}
                      </Td>
                      <Td>{h.location}</Td>
                      <Td align="right" className="font-semibold">
                        {formatTk(h.due)}
                      </Td>
                      <Td align="right">
                        <LinkButton href={`/admin/hotels/${h.id}/prices`} size="sm" variant="ghost">
                          Prices
                        </LinkButton>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Details">
            <div className="mb-5 flex items-center gap-4">
              <Photo path={customer.photoPath} alt={customer.user.name} size={64} />
            </div>
            <ActionForm action={updateCustomer} submitLabel="Save details" resetOnSuccess={false}>
              <input type="hidden" name="id" value={customer.id} />
              <CustomerFields customer={customer} />
            </ActionForm>
          </Card>
        </div>

        <Card title="Login">
          <div className="space-y-2 text-sm">
            <p>
              Status:{" "}
              {customer.user.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Disabled</Badge>}
            </p>
            {customer.user.mustChangePassword && (
              <p className="text-(--muted)">Has not set their own password yet.</p>
            )}
            <p className="text-(--muted)">Created {formatDateTime(customer.user.createdAt)}</p>
          </div>
          <div className="mt-5 space-y-4 border-t border-(--line) pt-5">
            <ActionForm
              action={resetOwnerPassword}
              submitLabel="Reset password"
              submitVariant="dark"
              confirm="Create a new temporary password and email it to the owner?"
            >
              <input type="hidden" name="id" value={customer.id} />
            </ActionForm>
            <ActionForm
              action={setCustomerLogin}
              submitLabel={customer.user.isActive ? "Disable login" : "Enable login"}
              submitVariant={customer.user.isActive ? "danger" : "primary"}
            >
              <input type="hidden" name="id" value={customer.id} />
              {!customer.user.isActive && <input type="hidden" name="isActive" value="on" />}
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
