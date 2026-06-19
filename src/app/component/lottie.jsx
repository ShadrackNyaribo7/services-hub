"use client";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useRef } from "react";


  
  const Lottie = ({ src = "/rocket.json", top = "0", left = "0", right = "auto", width = "600px", height = "100vh", zIndex = "0", animate = true, opacity = "0.7", scale = "1" }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && animate) {
      let animation;
      let intervalId;

    
    
      const startFlyingAnimation = () => {
        if (containerRef.current) {
          animation = containerRef.current.animate(
            [
              { transform: "translateX(-100vw)" },
              { transform: "translateX(100vw)" },
            ],
            {
              duration: 5000,
              iterations: 1,
              easing: "linear",
            }
          );
          
        }
      };

      // Start initial animation
      startFlyingAnimation();

      // Restart animation every 5 seconds to ensure continuity
      intervalId = setInterval(() => {
        if (animation) {
          animation.cancel();
        }
        startFlyingAnimation();
      }, 5000);

      return () => {
        if (animation) animation.cancel();
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [animate]);

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
      <DotLottieReact
        src={src} 

        loop 
        autoplay
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

export default Lottie;
