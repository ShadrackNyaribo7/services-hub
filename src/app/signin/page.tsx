import { SignIn } from "@clerk/nextjs";
import BackgroundLottieServer from "@/components/BackgroundLottieServer";

export default function Page() {
  return (
    <main className="relative flex min-h-screen items-center justify-center">
      <BackgroundLottieServer />
      <div className="relative z-10">
        <SignIn />
      </div>
    </main>
  );
}