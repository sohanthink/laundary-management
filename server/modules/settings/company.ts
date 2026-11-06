import "server-only";
import { db } from "@/server/db";

export const COMPANY_FIELDS = [
  { key: "company.name", label: "Company name" },
  { key: "company.address", label: "Address" },
  { key: "company.vat", label: "VAT number (P.IVA)" },
  { key: "company.taxCode", label: "Tax code (Codice fiscale)" },
  { key: "company.phone", label: "Phone" },
  { key: "company.email", label: "Email" },
  { key: "company.iban", label: "IBAN for bank transfers" },
  { key: "company.invoiceFooter", label: "Text at the bottom of invoices" },
] as const;

export type CompanyKey = (typeof COMPANY_FIELDS)[number]["key"];
export type Company = Record<CompanyKey, string>;

/** Company details printed on invoices. No auth check: shown to admin and hotel owners. */
export async function getCompany(): Promise<Company> {
  const rows = await db.setting.findMany({ where: { key: { startsWith: "company." } } });
  const values = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(COMPANY_FIELDS.map((f) => [f.key, values.get(f.key) ?? ""])) as Company;
}
