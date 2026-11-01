import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "TechIdea — Free Online Tools, Calculators & Public APIs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public", "techidea-logo.png"));
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#eef5f1", color: "#134e4a" }}><img src={`data:image/png;base64,${logo.toString("base64")}`} alt="TechIdea Online" width={450} height={150} style={{ marginBottom: 20 }} /><div style={{ fontSize: 76, fontWeight: 700 }}>Everyday tasks.</div><div style={{ fontSize: 76, fontWeight: 700 }}>Simpler answers.</div><div style={{ fontSize: 28, marginTop: 40 }}>Free Online Tools, Calculators &amp; Public APIs</div></div>, size);
}
