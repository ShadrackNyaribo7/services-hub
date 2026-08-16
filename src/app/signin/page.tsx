import { ClerkProvider, SignIn } from "@clerk/nextjs";
import Link from "next/link";
import AuthPage from "@/components/AuthPage";

export default function Page() {
  return (
    <ClerkProvider>
      <AuthPage>
        <div className="space-y-4">
          <SignIn />
          <Link
            href="/provider-signin"
            className="block rounded-md border border-emerald-500 bg-slate-950 px-4 py-3 text-center font-semibold text-emerald-300"
          >
            Provider sign-in with mobile — no email
          </Link>
        </div>
      </AuthPage>
    </ClerkProvider>
  );
}
