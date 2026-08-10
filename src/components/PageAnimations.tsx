"use client";

import LottieAnimation from "@/app/component/lottie";

export default function PageAnimations() {
  return (
    <div aria-hidden="true" className="site-animation-layer">
      <video
        className="site-background-video"
        src="/compressed-video.mp4?v=20260719"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <LottieAnimation
        src="/rocket.json"
        className="rocket-horizontal-flight"
        top="clamp(5rem, 14vh, 9rem)"
        left="0"
        width="clamp(220px, 34vw, 430px)"
        height="clamp(180px, 30vw, 330px)"
        zIndex={1}
        opacity="0.82"
        scale="1"
      />
    </div>
  );
}
