import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Textarea, TextField } from "@/components/ui/field";
import { Card, PageHeader } from "@/components/ui/layout";
import { requirePermission } from "@/server/auth/dal";
import { saveCompany } from "@/server/modules/settings/company-actions";
import { COMPANY_FIELDS, getCompany } from "@/server/modules/settings/company";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Company details") };
}

const LONG = new Set(["company.address", "company.invoiceFooter"]);

export default async function SettingsPage() {
  await requirePermission("admin:access");
  const company = await getCompany();

  return (
    <>
      <PageHeader title="Company details" description="Printed at the top and bottom of every invoice." />
      <Card className="max-w-2xl">
        <ActionForm action={saveCompany} submitLabel="Save" resetOnSuccess={false}>
          {COMPANY_FIELDS.map((f) =>
            LONG.has(f.key) ? (
              <Field key={f.key} label={f.label} name={f.key}>
                <Textarea name={f.key} defaultValue={company[f.key]} />
              </Field>
            ) : (
              <TextField key={f.key} label={f.label} name={f.key} defaultValue={company[f.key]} />
            ),
          )}
        </ActionForm>
      </Card>
    </>
  );
}
