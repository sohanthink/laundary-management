import { Field, Select, TextField } from "@/components/ui/field";
import { todayIso } from "@/server/dates";

export function PaymentFields() {
  return (
    <>
      <TextField label="Amount (tk)" name="amount" inputMode="decimal" placeholder="5000" required />
      <Field label="Method" name="method">
        <Select name="method" defaultValue="CASH">
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
          <option value="EMPLOYEE">Collected by employee</option>
        </Select>
      </Field>
      <TextField label="Date" name="date" type="date" defaultValue={todayIso()} required />
      <TextField label="Note" name="note" placeholder="Collected by Rahim" />
    </>
  );
}
