// Every edition of Dickens's working notes planned for Dickens Notes, in
// chronological order of publication. The homepage shows published editions
// first, each group in this order. To release an edition, flip `status` to
// "published" and add `href` and `thumbnail`.
//
// Source for dates, statuses, and release dates:
// src/pages/notes/additional-working-notes/index.mdx
//
// `description` is rendered as HTML (use <em> for titles within it).
// Forthcoming descriptions below are placeholders taken from the Additional
// Working Notes page; Anna Gibson and Adam Grener will supply homepage copy.
export const novels = [
  {
    title: "The Old Curiosity Shop",
    dates: "1840–41",
    status: "forthcoming",
    release: "Q2 2027",
    href: null,
    thumbnail: null,
    description:
      "Early planning documents that show us the first stages of Dickens’s notetaking practice as he wrote this weekly novel for <em>Master Humphrey’s Clock</em>.",
  },
  {
    title: "Martin Chuzzlewit",
    dates: "1843–44",
    status: "forthcoming",
    release: "Q2 2027",
    href: null,
    thumbnail: null,
    description:
      "Early planning documents that show us the first stages of Dickens’s working note system.",
  },
  {
    title: "Dombey and Son",
    dates: "1846–48",
    status: "forthcoming",
    release: "Q4 2026",
    href: null,
    thumbnail: null,
    description: "Dickens’s first full set of systematic working notes.",
  },
  {
    title: "David Copperfield",
    dates: "1849–50",
    status: "published",
    release: null,
    href: "/notes/david-copperfield",
    thumbnail: "/images/novels/david-copperfield-thumb.webp",
    description:
      "Immerse yourself in the composition of Dickens's most autobiographical novel through our introduction and annotations to these notes.",
  },
  {
    title: "Bleak House",
    dates: "1852–53",
    status: "published",
    release: null,
    href: "/notes/bleak-house",
    thumbnail: "/images/novels/bleak-house-thumb.webp",
    description:
      "Explore Dickens's management of the novel's dual narrators with our introduction and annotations to these notes.",
  },
  {
    title: "Hard Times",
    dates: "1854",
    status: "published",
    release: null,
    href: "/notes/hard-times",
    thumbnail: "/images/novels/hard-times-thumb.webp",
    description:
      "Follow Dickens's difficulties navigating a weekly serial with our introduction and annotations to these notes.",
  },
  {
    title: "Little Dorrit",
    dates: "1855–57",
    status: "published",
    release: null,
    href: "/notes/little-dorrit",
    thumbnail: "/images/novels/little-dorrit-thumb.webp",
    description:
      "Discover how Dickens's idea for 'Nobody's Fault' transformed into 'Little Dorrit' through our introduction and annotations to these notes.",
  },
  {
    title: "Great Expectations",
    dates: "1860–61",
    status: "forthcoming",
    release: "Q4 2027",
    href: null,
    thumbnail: null,
    description: "Three pages of planning documents for this weekly novel.",
  },
  {
    title: "Our Mutual Friend",
    dates: "1864–65",
    status: "forthcoming",
    release: "Q4 2027",
    href: null,
    thumbnail: null,
    description:
      "Full set of working notes for Dickens’s last completed monthly novel.",
  },
  {
    title: "The Mystery of Edwin Drood",
    dates: "1870",
    status: "forthcoming",
    release: "Q4 2026",
    href: null,
    thumbnail: null,
    description:
      "Partial set of working notes for I–VI, and Dickens’s blank headed sheets for the prospective numbers VII–XII. (Dickens died while he was writing this novel.)",
  },
];
