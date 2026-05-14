import { prisma } from "@/lib/db";
import AdminBar from "@/components/admin/AdminBar";
import ProfileEditor from "@/components/admin/ProfileEditor";
import type { Profile } from "@/types";

const DEFAULT_PROFILE: Profile = {
  name: "",
  role: "",
  bio: "",
  email: "",
  github: "",
  location: "",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const row = await prisma.profile.findUnique({ where: { id: 1 } });
  const profile: Profile = row ?? DEFAULT_PROFILE;
  return (
    <>
      <AdminBar title="Profile" variant="form" />
      <ProfileEditor initial={profile} />
    </>
  );
}
