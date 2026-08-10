import { ImageResponse } from "next/og";

export const alt = "PATANAFUU — book trusted services across Kenya";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, rgb(2, 6, 23), rgb(6, 78, 59))",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "72px",
        textAlign: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          color: "rgb(52, 211, 153)",
          display: "flex",
          fontSize: 76,
          fontWeight: 800,
          letterSpacing: "0.08em",
        }}
      >
        PATANAFUU
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 42,
          fontWeight: 600,
          marginTop: "28px",
          maxWidth: "920px",
        }}
      >
        Book approved service providers across Kenya
      </div>
      <div
        style={{
          color: "rgb(203, 213, 225)",
          display: "flex",
          fontSize: 26,
          marginTop: "24px",
        }}
      >
        Secure authentication · M-Pesa payments
      </div>
    </div>,
    size,
  );
}
