import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import NavBar from "@/components/atoms/NavBar";
import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      {/* pb-16 leaves room for the fixed bottom nav */}
      <div className="pb-16">{children}</div>
      <NavBar />
    </>
  );
}
