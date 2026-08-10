import { ClerkProvider, SignIn } from "@clerk/nextjs";
import AuthPage from "@/components/AuthPage";

export default function Page() {
  return (
    <ClerkProvider>
      <AuthPage>
        <SignIn />
      </AuthPage>
    </ClerkProvider>
  );
}
