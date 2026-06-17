"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useRef } from "react";

const Lottie = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const animation = containerRef.current.animate(
        [
          { transform: "translateX(-100vw)" },
          { transform: "translateX(100vw)" },
        ],
        {
          duration: 10000,
          iterations: Infinity,
          easing: "linear",
        }
      );

      return () => animation.cancel();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: "0",
        bottom: "0",
        left: "50%",
        height: "600px",
        width: "600px",
        opacity: "0.7",
        pointerEvents: "none",
        zIndex: "0",
      }}
    >
      <DotLottieReact
        src="/rocket.json"
        loop
        autoplay
        style={{
          height: "100%",
          width: "100%",
        }}
      />
    </div>
  );
};

export default Lottie;
