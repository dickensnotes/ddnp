# Manuscript image display: what IIIF can do, and where it can't

Findings from prototyping the non-standard Dombey and Son images (issue #309,
Adam's "mirador notes" column in the master transcription list) in Mirador
4.2.4 with the Mirador Annotation Editor (MAE). Tested 2026-10-18.

Try them in the editor test (`/annotate/test/`):

- **Manuscript image prototype**: HT WN 01 (manuscript and transcription
  layers), DS WN 01 recto and verso (rotation).
- **Hard cases: display options**: DS WN 04, 05, 06, one canvas per option.
- **Hard cases: WN 06 in book view**: switch the window to Book view.

Manifests: `public/iiif/prototype/`. The hard-cases manifests are generated
by `scripts/prototype/build_hard_cases.py`; the WN 04 cut-out image by
`scripts/prototype/cutout.py`.

## The approach

We write our own IIIF Presentation v2 manifests. Canvas IDs are ours;
annotations attach to them. Each canvas's images point at **V&A image URLs
only** (`framemark.vam.ac.uk/collections/{id}/...`), never at V&A manifests,
which the V&A says aren't final. The V&A image server (IIIF Image API 2,
level 1) supports what we need:

| Feature | V&A support | Used for |
|---|---|---|
| Rotation by 90° steps | Yes (`rotationBy90s`) | Every sideways image |
| Rectangular crop (region) | Yes | Separating half-sheets from notes |
| Mirroring | Yes | Not needed so far |
| Arbitrary rotation | No | Not needed |
| PNG / transparency | No (JPEG only) | Needed for non-rectangular cut-outs |
| Size | Up to 2500px (HT: 5440px) | Rotated/cropped images are single JPEGs, ~200–450 KB |

Rotated or cropped images can't use the tiled image service (Mirador would
tile the unrotated original), so they're single JPEGs. For Dombey that loses
nothing: the server caps those images at 2500px anyway. Unrotated images
(Hard Times) keep the tiled service and deep zoom.

## Results by image

### DS WN 04: non-rectangular note (L-shape of two pieces)

| Option | How | IIIF only? | Result |
|---|---|---|---|
| A. Whole image | Rotated 90° | Yes | Works. The cream mount shows in the empty corner. |
| B. Two crops | Upper sheet and lower strip cropped separately, placed with `#xywh` | Yes | Works. Empty corner shows the viewer background. Edges are straight cuts, so slivers of mount show along the torn edges. |
| C. Cut-out | Mount removed by image processing (colour: mount is cream, paper isn't), saved as WebP with transparency, hosted by us | **No** | Works and looks best: real torn edges, no mount. |

A, B and C share the same canvas coordinates, so a transcription layer or
annotations made on one fit the others. We can start with A or B and switch
to C later without redoing work.

### DS WN 05: half-sheet pasted on, calculation on its underside

f. 10r shows the half-sheet folded down over the note; f. 10v (a 2026 photo)
shows it turned back, with the underside's calculation beside the note.

| Option | How | IIIF only? | Result |
|---|---|---|---|
| A. Note (f. 10r) | Rotated 90° | Yes | Works |
| B. Whole verso photo | f. 10v rotated 90°, as in the spreadsheet | Yes | Works. Shows the note *and* the underside; the note's text appears twice in the edition (A and B). |
| C. Underside only | f. 10v cropped to the half-sheet, rotated 90° | Yes | Works. Clean, but loses how it's attached. |
| D. Note + underside | f. 10r and the C crop side by side on one canvas | Yes | Works. One canvas for annotations covering both. |

### DS WN 06: archivists' half-sheet ("Florence's age mems"), writing front and back

Front is on f. 11r beside the note; back is on f. 11v. Front needs 90°
rotation (like the note); back needs 270°.

| Option | How | IIIF only? | Result |
|---|---|---|---|
| A. Whole image | Rotated 90° | Yes | Works. Half-sheet front appears as part of the note. |
| B. Note only | Cropped to the note | Yes | Works. Half-sheet becomes its own page(s). |
| C. Front + back | Half-sheet front and back crops side by side on one canvas | Yes | Works. MAE drawing works on the composite. |
| D. Turn it over | Whole image, with back and front crops stacked at the half-sheet's position; hide the front in the Layers panel to see the back | Yes | Works. The control is the Layers panel, which isn't obvious. |
| E. Book view | Note, front, back as separate canvases; Mirador's Book view shows front + back as a spread | Yes | Works. Users must switch to Book view (or we default to it). |

## Where we'd need something other than IIIF

1. **Non-rectangular shapes (WN 04).** The Image API only crops rectangles
   and the V&A only serves JPEG, so a true cut-out means processing the image
   and hosting the result ourselves. Hosting a processed copy of a V&A image
   needs **V&A permission**, and we'd need somewhere permanent to host it
   (dickens-annotations GitHub Pages, like the transcription images).
2. **A Choice with placement.** IIIF's `oa:Choice` would make WN 06 D start
   with the back hidden (cleaner than stacked layers), but Mirador 4.2.4
   ignores `#xywh` for Choice items and stretches them over the whole canvas
   (`MiradorCanvas.resourceAnnotation` matches the Choice's items against the
   annotation's resource, which is the Choice itself). That's a Mirador bug,
   not IIIF. Fixable with a small build-time patch like `scripts/mae-patches.mjs`,
   or upstream.
3. **Discoverable controls.** Layers (fade between transcription and
   manuscript; turn a half-sheet over) and Book view are all Mirador
   built-ins, but they sit in a side panel or a menu. A clear "Show
   manuscript" / "Turn over" button is a small Mirador plugin, not IIIF.
4. **Hosting our own images.** Anything we generate (cut-outs, realigned
   transcription images) needs a permanent absolute URL. The prototype uses
   site-relative paths so it works on preview deploys; a real edition should
   not.

## Things that affect the plan

- **Fix canvas sizes before annotating.** Annotations are stored in canvas
  pixels. Changing a canvas's size or layout later (e.g. switching WN 06 from
  A to B) means moving or redoing its annotations. Choosing between options
  that share coordinates (WN 04 A/B/C) is free.
- **Transcription images must match the canvas.** For the fade to line up,
  transcriptions need to be made at the canvas's size and orientation (2500 ×
  1875 for most rotated Dombey notes). The published HT transcriptions are
  2700 × 2100 and visibly drift against the V&A photo; the realigned ones in
  Drive should fix that (not yet tested — they need a Google sign-in).
- **New canvases have no published annotation list.** The editor adapter now
  treats that as "no annotations" instead of failing.
- **Drood isn't covered yet.** The Drood tab has no Mirador notes, and one
  Drood image (f. 11r) is landscape among portraits, so it can't simply be
  rotated like the rest.

## Not tested

- Saving annotations (no GitHub token was used).
- The realigned Hard Times transcriptions.
- Mobile.
