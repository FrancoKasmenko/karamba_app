import type { Metadata } from "next";
import PodcastContent from "./podcast-content";

export const metadata: Metadata = {
  title: "Podcast - Más que un Montón",
  description:
    "Nuestro podcast donde hablamos de emprendimiento, creatividad y las historias detrás de cada proyecto.",
};

export default function PodcastPage() {
  return <PodcastContent />;
}
