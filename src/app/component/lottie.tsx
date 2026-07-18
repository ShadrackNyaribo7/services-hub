"use client";
import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * LottieAnimation Component
 *
 * Handles both standard .json Lottie files (via lottie-react) and
 * compressed .lottie files (via @lottiefiles/dotlottie-react).
 *
 * @param {string} src - Path to the animation file (.json or .lottie)
 * @param {string} top - CSS top position (default: "0")
 * @param {string} left - CSS left position (default: "0")
 * @param {string} right - CSS right position (default: "auto")
 * @param {string} width - CSS width (default: "600px")
 * @param {string} height - CSS height (default: "100vh")
 * @param {number} zIndex - CSS z-index layer (default: 0)
 * @param {string} opacity - CSS opacity (default: "0.7")
 * @param {string} scale - CSS transform scale (default: "1")
 * @param {boolean} loop - Loop the animation (default: true)
 * @param {boolean} autoplay - Auto-play the animation (default: true)
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
  const [isClient, setIsClient] = useState(false);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // For .json files, fetch and parse the animation data for lottie-react
  useEffect(() => {
    if (!src || !src.endsWith(".json")) return;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${src}`);
        return res.json();
      })
      .then((data) => {
        setAnimationData(data);
        setLoadError(false);
      })
      .catch((err) => {
        console.error("LottieAnimation: Failed to load animation:", err);
        setLoadError(true);
      });
  }, [src]);

  if (!isClient) {
    return null;
  }

  const isJsonFile = src.endsWith(".json");
  const isLottieFile = src.endsWith(".lottie");

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
      {isJsonFile && animationData && (
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
      {isJsonFile && !animationData && !loadError && null}
      {isJsonFile && loadError && (
        <div style={{ color: "red", fontSize: "12px" }}>
          Animation failed to load
        </div>
      )}
      {isLottieFile && (
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
      )}
    </div>
  );
};

export default LottieAnimation;