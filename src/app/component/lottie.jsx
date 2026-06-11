import {DotLottie} from "@lottiefiles/dotlottie-react";
import "./rocket.json"

const options = {
    animationData: rocket.json,
    autoplay: true,
};

const style = {
  height: 800,

}
 
const Lottie = () => {
    const animation = DotLottie(options,style);

    animation;

}


export default DotLottie;