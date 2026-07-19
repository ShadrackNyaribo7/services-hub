import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="relative flex min-h-screen items-center justify-center">
      <div className="relative z-10">
        <SignIn />
      </div>
    </main>
  );
}
