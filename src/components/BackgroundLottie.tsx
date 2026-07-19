"use client";

import LottieAnimation from "@/app/component/lottie";

export default function BackgroundLottie() {
  return (
    <LottieAnimation 
      src="/background-animation.lottie" 
      top="0" 
      left="0" 
      width="100%" 
      height="100vh" 
      zIndex={0} 
      opacity="0.2" 
      scale="1.2" 
    />
  );
}
