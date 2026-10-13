import { PageTitle } from "@/components/ui";
import { AdminAccountSettings } from "@/components/AdminAccountSettings";
import { requirePage } from "@/lib/guard";

export const metadata = { title: "Account settings" };

export default async function AdminSettingsPage() {
  const admin = await requirePage("ADMIN");
  return (
    <>
      <PageTitle title="Account settings" />
      <AdminAccountSettings email={admin.email} />
    </>
  );
}
