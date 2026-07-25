import Image from "next/image";

export default function BrandLogo({ className }: { className: string }) {
  return (
    <Image
      src="/Creative Idea.svg"
      alt="PATANAFUU Logo"
      width={150}
      height={50}
      className={className}
    />
  );
}
