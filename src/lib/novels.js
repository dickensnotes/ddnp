/** The novels whose Working Notes can be annotated, in publication order. */
const IIIF = "https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif";

export const NOVELS = [
  { slug: "david-copperfield", title: "David Copperfield", manifest: `${IIIF}/davidcopperfieldtranscription/manifest.json` },
  { slug: "bleak-house", title: "Bleak House", manifest: `${IIIF}/bleakhousetranscriptions/manifest.json` },
  { slug: "hard-times", title: "Hard Times", manifest: `${IIIF}/HardTimesTranscription/manifest.json` },
  { slug: "little-dorrit", title: "Little Dorrit", manifest: `${IIIF}/littledorrittranscription/manifest.json` },
  // V&A manuscript images: Hard Times with manuscript and transcription
  // layers, and a Dombey and Son note rotated from the V&A image. Served
  // from this site (public/iiif/prototype/), so the path is site-relative.
  { slug: "image-prototype", title: "Manuscript image prototype", manifest: "/iiif/prototype/manifest.json" },
  // All six Hard Times notes on the V&A images, with the realigned transcriptions
  { slug: "hard-times-vam", title: "Hard Times: V&A images", manifest: "/iiif/prototype/hard-times.json" },
  // Display options for the non-standard Dombey and Son notes (WN 04-06)
  { slug: "hard-cases", title: "Hard cases: display options", manifest: "/iiif/prototype/hard-cases.json" },
  { slug: "hard-cases-book", title: "Hard cases: WN 06 in book view", manifest: "/iiif/prototype/hard-cases-book.json" },
];
