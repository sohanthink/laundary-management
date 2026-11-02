import { Field, Input, TextField } from "@/components/ui/field";

type Customer = {
  phone: string;
  address: string | null;
  user: { name: string; email: string };
};

export function CustomerFields({ customer }: { customer?: Customer }) {
  return (
    <>
      <TextField label="Owner name" name="name" defaultValue={customer?.user.name} required />
      <TextField
        label="Email (used to sign in)"
        name="email"
        type="email"
        defaultValue={customer?.user.email}
        required
      />
      <TextField label="Phone" name="phone" defaultValue={customer?.phone} required />
      <TextField label="Address" name="address" defaultValue={customer?.address ?? ""} />
      <Field label="Photo" name="photo" hint="JPG, PNG or WebP, up to 2 MB">
        <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" />
      </Field>
    </>
  );
}

type Hotel = {
  name: string;
  location: string;
  taxNo: string | null;
  tradeLicense: string | null;
  email: string | null;
  phone: string | null;
};

export function HotelFields({ hotel }: { hotel?: Hotel }) {
  return (
    <>
      <TextField label="Hotel / guest house name" name="name" defaultValue={hotel?.name} required />
      <TextField label="Location" name="location" defaultValue={hotel?.location} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Tax no." name="taxNo" defaultValue={hotel?.taxNo ?? ""} />
        <TextField label="Trade license" name="tradeLicense" defaultValue={hotel?.tradeLicense ?? ""} />
      </div>
      <TextField
        label="Hotel email"
        name="email"
        type="email"
        defaultValue={hotel?.email ?? ""}
        hint="Receipts go here. If empty, they go to the owner's email."
      />
      <TextField label="Hotel phone" name="phone" defaultValue={hotel?.phone ?? ""} />
    </>
  );
}
