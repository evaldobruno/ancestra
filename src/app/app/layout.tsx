import { AppShell } from "@/components/AppShell";
import { AccessGate } from "@/components/AccessGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <AccessGate>{children}</AccessGate>
    </AppShell>
  );
}
