import { Field, Option, Select, TextField } from "@/components/ui/field";
import { todayIso } from "@/server/dates";

export function PaymentFields() {
  return (
    <>
      <TextField label="Amount (€)" name="amount" inputMode="decimal" placeholder="50,00" required />
      <Field label="Method" name="method">
        <Select name="method" defaultValue="CASH">
          <Option value="CASH">Cash</Option>
          <Option value="BANK">Bank</Option>
          <Option value="POS">POS (card)</Option>
          <Option value="EMPLOYEE">Collected by employee</Option>
        </Select>
      </Field>
      <TextField label="Date" name="date" type="date" defaultValue={todayIso()} required />
      <TextField label="Note" name="note" placeholder="Collected by Rahim" />
    </>
  );
}
