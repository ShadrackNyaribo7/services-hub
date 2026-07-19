"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
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
  dataTestId?: string;
}

type AnimationLoadState =
  | { src: string; mode: "json"; data: object; error: false }
  | { src: string; mode: "dotlottie"; data: null; error: false }
  | { src: string; mode: null; data: null; error: true };

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

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
  dataTestId,
}: LottieAnimationProps) => {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [loadState, setLoadState] = useState<AnimationLoadState | null>(null);

  useEffect(() => {
    if (!src) return;

    const controller = new AbortController();
    const normalizedSrc = src.toLowerCase();

    const loadAnimation = async () => {
      try {
        if (normalizedSrc.endsWith(".json")) {
          const res = await fetch(src, { signal: controller.signal });
          if (!res.ok) throw new Error(`Failed to load ${src}`);
          setLoadState({
            src,
            mode: "json",
            data: await res.json(),
            error: false,
          });
          return;
        }

        if (normalizedSrc.endsWith(".lottie")) {
          const res = await fetch(src, { signal: controller.signal });
          if (!res.ok) throw new Error(`Failed to load ${src}`);

          const buffer = await res.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const isZipArchive = bytes[0] === 0x50 && bytes[1] === 0x4b;

          if (isZipArchive) {
            setLoadState({ src, mode: "dotlottie", data: null, error: false });
            return;
          }

          const text = new TextDecoder().decode(buffer).trimStart();
          if (text.startsWith("{") || text.startsWith("[")) {
            setLoadState({
              src,
              mode: "json",
              data: JSON.parse(text),
              error: false,
            });
            return;
          }
        }

        throw new Error(`Unsupported Lottie animation format: ${src}`);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("LottieAnimation: Failed to load animation:", err);
        setLoadState({ src, mode: null, data: null, error: true });
      }
    };

    loadAnimation();

    return () => controller.abort();
  }, [src]);

  if (!isClient) {
    return null;
  }

  const isLoadedSource = loadState?.src === src;
  const animationData = isLoadedSource && loadState.mode === "json"
    ? loadState.data
    : null;
  const renderMode = isLoadedSource ? loadState.mode : null;
  const loadError = isLoadedSource ? loadState.error : false;

  return (
    <div
      data-testid={dataTestId}
      data-animation-src={src}
      aria-hidden="true"
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
      {renderMode === "json" && animationData && (
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
      {!renderMode && !loadError && null}
      {loadError && (
        <div style={{ color: "red", fontSize: "12px" }}>
          Animation failed to load
        </div>
      )}
      {renderMode === "dotlottie" && (
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
