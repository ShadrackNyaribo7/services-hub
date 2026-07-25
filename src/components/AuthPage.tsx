import type { ReactNode } from "react";

export default function AuthPage({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center">
      <div className="relative z-10">{children}</div>
    </main>
  );
}
