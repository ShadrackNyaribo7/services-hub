"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * LottieAnimation Component
 *
 * A wrapper component around DotLottieReact for displaying compressed .lottie animations
 * as background elements. Supports positioning, scaling, and opacity control.
 *
 * The DotLottieReact component handles the actual .lottie file rendering on the client side,
 * while this component adds container positioning and styling control.
 *
 * @param {string} src - Path to the .lottie animation file
 * @param {string} top - CSS top position (default: "0")
 * @param {string} left - CSS left position (default: "0")
 * @param {string} right - CSS right position (default: "auto")
 * @param {string} width - CSS width (default: "600px")
 * @param {string} height - CSS height (default: "100vh")
 * @param {number} zIndex - CSS z-index layer (default: 0)
 * @param {string} opacity - CSS opacity (default: "0.7")
 * @param {string} scale - CSS transform scale (default: "1")
 * @param {boolean} loop - Loop the internal animation (default: true)
 * @param {boolean} autoplay - Auto-play the internal animation (default: true)
 */
interface LottieAnimationProps {
  src?: string;
  top?: string;
  left?: string;
  right?: string;
  width?: string;
  height?: string;
  zIndex?: number;
  opacity?: string;
  scale?: string;
  loop?: boolean;
  autoplay?: boolean;
}

const LottieAnimation = ({
  src = "/rocket.json",
  top = "0",
  left = "0",
  right = "auto",
  width = "600px",
  height = "100vh",
  zIndex = 0,
  opacity = "0.7",
  scale = "1",
  loop = true,
  autoplay = true,
}: LottieAnimationProps) => {
  return (
    <div
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
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        style={{
          height: "100%",
          width: "100%",
          transform: `scale(${scale})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
};

export default LottieAnimation;