import { AdminHeader } from "@/components/shared/admin-header";
import { spaceGrotesk } from "@/lib/fonts";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={`${spaceGrotesk.variable} flex flex-1 flex-col`}>
      <AdminHeader />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-5 py-6">
        {children}
      </main>
    </div>
  );
}
