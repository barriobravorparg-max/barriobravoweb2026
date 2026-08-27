import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0B0D",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            backgroundImage: "linear-gradient(90deg, #FF9B7A 0%, #FF6B8A 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          BARRIO BRAVO RP
        </div>
        <div style={{ fontSize: 32, color: "#9B5FC0", marginTop: 16 }}>Roleplay FiveM/QBCore latinoamericano</div>
      </div>
    ),
    size
  );
}
