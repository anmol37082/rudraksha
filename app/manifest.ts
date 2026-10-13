import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rudraksha Events — Wedding Staff",
    short_name: "Rudraksha",
    description: `${SITE.name} wedding and event staff recruitment portal.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f2e8",
    theme_color: "#09251b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
