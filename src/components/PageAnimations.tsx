"use client";

import LottieAnimation from "@/app/component/lottie";
import { usePathname } from "next/navigation";

export default function PageAnimations() {
  const pathname = usePathname();

  if (pathname?.startsWith("/services/ufp")) {
    return null;
  }

  return (
    <div aria-hidden="true">
      <LottieAnimation
        src="/background-animation.lottie"
        top="0"
        left="0"
        width="100%"
        height="100vh"
        zIndex={0}
        opacity="0.18"
        scale="1.2"
      />
      <LottieAnimation
        src="/rocket.json"
        top="clamp(4rem, 12vh, 7rem)"
        left="max(-3rem, calc(50% - 40rem))"
        width="clamp(220px, 34vw, 430px)"
        height="clamp(180px, 30vw, 330px)"
        zIndex={1}
        opacity="0.7"
        scale="1"
      />
    </div>
  );
}
