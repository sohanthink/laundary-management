import type { Metadata } from "next";
import { Photo } from "@/components/photo";
import { ActionForm } from "@/components/ui/action-form";
import { LinkButton } from "@/components/ui/button";
import { Field, Input, TextField } from "@/components/ui/field";
import { Card, PageHeader } from "@/components/ui/layout";
import { updateOwnProfile } from "@/server/modules/portal/actions";
import { getOwnProfile } from "@/server/modules/portal/queries";

export const metadata: Metadata = { title: "Profile" };

export default async function OwnerProfilePage() {
  const { user, customer } = await getOwnProfile();

  return (
    <>
      <PageHeader
        title="Your profile"
        description={`Signed in as ${user.email}`}
        actions={<LinkButton href="/change-password">Change password</LinkButton>}
      />
      <Card className="max-w-xl">
        <div className="mb-5">
          <Photo path={customer?.photoPath} alt={user.name} size={72} />
        </div>
        <ActionForm action={updateOwnProfile} submitLabel="Save profile" resetOnSuccess={false}>
          <TextField label="Name" name="name" defaultValue={user.name} required />
          <TextField label="Phone" name="phone" defaultValue={customer?.phone} required />
          <TextField label="Address" name="address" defaultValue={customer?.address ?? ""} />
          <Field label="Photo" name="photo" hint="JPG, PNG or WebP, up to 2 MB">
            <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" />
          </Field>
          <p className="text-xs text-(--muted)">To change your login email, please contact the admin.</p>
        </ActionForm>
      </Card>
    </>
  );
}
