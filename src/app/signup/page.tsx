import { SignUp } from "@clerk/nextjs";
import AuthPage from "@/components/AuthPage";

export default function Page() {
  return (
    <AuthPage>
      <SignUp />
    </AuthPage>
  );
}
