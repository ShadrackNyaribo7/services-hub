"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useRef } from "react";

/**
 * LottieAnimation Component
 *
 * A wrapper component around DotLottieReact that adds custom animation behaviors
 * like flying across the screen, positioning, and scaling control.
 *
 * The DotLottieReact component handles the actual .lottie and .json file
 * rendering on the client side, while this component adds additional
 * functionality like container positioning, custom flying animations,
 * and styling control.
 *
 * @param {string} src - Path to the .lottie or .json animation file
 * @param {boolean} animate - Enable/disable custom flying animation (default: true)
 * @param {string} top - CSS top position (default: "0")
 * @param {string} left - CSS left position (default: "0")
 * @param {string} right - CSS right position (default: "auto")
 * @param {string} width - CSS width (default: "600px")
 * @param {string} height - CSS height (default: "100vh")
 * @param {number} zIndex - CSS z-index layer (default: 0)
 * @param {string} opacity - CSS opacity (default: "0.7")
 * @param {string} scale - CSS transform scale (default: "1")
 * @param {number} duration - Flying animation duration in ms (default: 5000)
 * @param {boolean} loop - Loop the internal animation (default: true)
 * @param {boolean} autoplay - Auto-play the internal animation (default: true)
 */
interface LottieAnimationProps {
  src?: string;
  animate?: boolean;
  top?: string;
  left?: string;
  right?: string;
  width?: string;
  height?: string;
  zIndex?: number;
  opacity?: string;
  scale?: string;
  duration?: number;
  loop?: boolean;
  autoplay?: boolean;
}

const LottieAnimation = ({
  src = "/rocket.json",
  animate = true,
  top = "0",
  left = "0",
  right = "auto",
  width = "600px",
  height = "100vh",
  zIndex = 0,
  opacity = "0.7",
  scale = "1",
  duration = 5000,
  loop = true,
  autoplay = true,
}: LottieAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    if (containerRef.current && animate) {
      let animation: Animation | null = null;
      let intervalId: NodeJS.Timeout | null = null;

      const startFlyingAnimation = () => {
        if (containerRef.current) {
          animation = containerRef.current.animate(
            [
              { transform: "translateX(-100vw)" },
              { transform: "translateX(100vw)" },
            ],
            {
              duration: duration,
              iterations: 1,
              easing: "linear",
            }
          );
        }
      };

      // Start initial animation
      startFlyingAnimation();

      // Restart animation continuously based on duration
      intervalId = setInterval(() => {
        if (animation) {
          animation.cancel();
        }
        startFlyingAnimation();
      }, duration);

      return () => {
        if (animation) animation.cancel();
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [animate, duration]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: top,
        left: left,
        right: right,
        width: width,
        height: height,
        opacity: opacity,
        pointerEvents: "none",
        zIndex: zIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {animationData && (
        <Lottie
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          style={{
            height: "100%",
            width: "100%",
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        />
      )}
    </div>
  );
};

export default LottieAnimation;