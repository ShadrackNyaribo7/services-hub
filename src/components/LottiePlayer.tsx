"use client";

import { useEffect, useState } from "react";
import Lottie, { type LottieComponentProps } from "lottie-react";

type LottiePlayerProps = Omit<LottieComponentProps, "animationData"> & {
  src: string;
};

export default function LottiePlayer({ src, ...props }: LottiePlayerProps) {
  const [animationData, setAnimationData] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    fetch(src)
      .then((res) => res.json())
      .then((data) => {
        if (active) setAnimationData(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [src]);

  if (!animationData) return null;

  return <Lottie animationData={animationData} {...props} />;
}
