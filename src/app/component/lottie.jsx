import { DotLottie } from "@lottiefiles/dotlottie-react";
import rocketAnimation from "../../public/rocket.json";

const Lottie = () => {
  return (
    <DotLottie
      src={rocketAnimation}
      autoplay
      loop
      style={{ height: 400, width: 400 }}
    />
  );
};

export default Lottie;