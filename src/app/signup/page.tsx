import { ClerkProvider, SignUp } from "@clerk/nextjs";
import AuthPage from "@/components/AuthPage";

export default function Page() {
  return (
    <ClerkProvider>
      <AuthPage>
        <SignUp />
      </AuthPage>
    </ClerkProvider>
  );
}
