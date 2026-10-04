/** The novels whose Working Notes can be annotated, in publication order. */
const IIIF = "https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif";

export const NOVELS = [
  { slug: "david-copperfield", title: "David Copperfield", manifest: `${IIIF}/davidcopperfieldtranscription/manifest.json` },
  { slug: "bleak-house", title: "Bleak House", manifest: `${IIIF}/bleakhousetranscriptions/manifest.json` },
  { slug: "hard-times", title: "Hard Times", manifest: `${IIIF}/HardTimesTranscription/manifest.json` },
  { slug: "little-dorrit", title: "Little Dorrit", manifest: `${IIIF}/littledorrittranscription/manifest.json` },
];
