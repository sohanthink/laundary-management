import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/server/money";
import { createCustomer } from "@/server/modules/customers/actions";
import { listCustomers } from "@/server/modules/customers/queries";
import { CustomerFields } from "./fields";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Customers") };
}

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <>
      <PageHeader
        title="Customers"
        description="Hotel owners. Each customer can have several hotels."
        actions={
          <Modal
            trigger="New customer"
            title="New customer"
            description="A login is created with a temporary password, shown here and emailed when email is set up."
          >
            <ActionForm action={createCustomer} submitLabel="Create customer" closeOnSuccess={false}>
              <CustomerFields />
            </ActionForm>
          </Modal>
        }
      />
      <Card>
        {customers.length === 0 ? (
          <Empty>No customers yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Owner</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th align="right">Hotels</Th>
                <Th align="right">Total due</Th>
                <Th>Login</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3 font-medium hover:text-(--teal)">
                      <Photo path={c.photoPath} alt={c.user.name} />
                      {c.user.name}
                    </Link>
                  </Td>
                  <Td>{c.user.email}</Td>
                  <Td>{c.phone}</Td>
                  <Td align="right">{c.hotels.length}</Td>
                  <Td align="right" className="font-semibold">
                    {formatMoney(c.totalDue)}
                  </Td>
                  <Td>
                    {c.user.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Disabled</Badge>}
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
