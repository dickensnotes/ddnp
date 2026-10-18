"""Build the hard-cases options manifests for the editor test.

Each canvas is a list of image placements. An image is a V&A image (by
framemark id) with an optional source region and a rotation; the V&A
Image API does the crop and rotation. `at` places it on the canvas
(#xywh); without it the image fills the canvas.

    python3 scripts/prototype/build_hard_cases.py public/iiif/prototype
"""
import json
import sys
from pathlib import Path

V = "https://framemark.vam.ac.uk/collections"
CANVAS_BASE = "https://dickensnotes.github.io/dickens-annotations/canvas/prototype"
SITE = "https://www.dickensnotes.com/iiif/prototype"

# Source image sizes (from each image's info.json)
SIZES = {
    "2012FE1488": (2500, 1875),  # f. 09r  DS WN 04
    "2012FE1496": (1875, 2500),  # f. 10r  DS WN 05
    "2026PR3250": (2500, 1830),  # f. 10v  DS WN 05 verso (half-sheet turned back)
    "2012FE1494": (2500, 1553),  # f. 11r  DS WN 06 (+ half-sheet front)
    "2012FE1489": (2500, 1875),  # f. 11v  DS WN 06 verso (+ half-sheet back)
}
FOLIO = {"2012FE1488": "f. 9r", "2012FE1496": "f. 10r", "2026PR3250": "f. 10v",
         "2012FE1494": "f. 11r", "2012FE1489": "f. 11v"}


def rotated_size(w, h, rotation):
    return (h, w) if rotation in (90, 270) else (w, h)


def image(src, rotation, region=None, label=None):
    """A painting resource: V&A region + rotation, as a single JPEG."""
    w, h = region[2:] if region else SIZES[src]
    rw, rh = rotated_size(w, h, rotation)
    region_param = ",".join(map(str, region)) if region else "full"
    desc = f"{FOLIO[src]}" + (f", region {region_param}" if region else "") + f", rotated {rotation}°"
    return {
        "@id": f"{V}/{src}/{region_param}/full/{rotation}/default.jpg",
        "@type": "dctypes:Image",
        "label": label or f"Manuscript (V&A, Forster MS 160, {desc})",
        "format": "image/jpeg",
        "width": rw,
        "height": rh,
    }


def local_image(path, width, height, label):
    """A painting resource hosted on this site (not served by the V&A)."""
    # Site-relative so it loads on any host (preview, local); a real edition
    # would host these at a permanent absolute URL
    return {"@id": f"/iiif/prototype/{path}", "@type": "dctypes:Image", "label": label,
            "format": "image/webp", "width": width, "height": height}


def painting(canvas_id, resource, at=None):
    on = f"{canvas_id}#xywh={','.join(map(str, at))}" if at else canvas_id
    return {"@type": "oa:Annotation", "motivation": "sc:painting", "on": on, "resource": resource}


def canvas(name, label, size, paintings, thumb):
    cid = f"{CANVAS_BASE}/{name}.json"
    return {
        "@id": cid,
        "@type": "sc:Canvas",
        "label": label,
        "width": size[0],
        "height": size[1],
        "thumbnail": {"@id": thumb, "@type": "dctypes:Image"},
        "images": [painting(cid, res, at) for res, at in paintings],
    }


def thumb(src, rotation, region=None):
    region_param = ",".join(map(str, region)) if region else "full"
    return f"{V}/{src}/{region_param}/!200,200/{rotation}/default.jpg"



def manifest(slug, label, description, canvases, paged=False):
    seq = {"@type": "sc:Sequence", "canvases": canvases}
    if paged:
        seq["viewingHint"] = "paged"
    return {
        "@context": "http://iiif.io/api/presentation/2/context.json",
        "@id": f"{SITE}/{slug}.json",
        "@type": "sc:Manifest",
        "label": label,
        "description": description,
        "attribution": "Manuscript images © Victoria and Albert Museum, London",
        "sequences": [seq],
    }


# Regions, in source (unrotated V&A) pixels
WN04_UPPER = (50, 12, 1400, 900)      # upper-left sheet
WN04_LOWER = (50, 900, 2315, 900)     # full-width lower strip
WN05_UNDERSIDE = (62, 850, 1225, 890)  # calculation on the turned-back half-sheet (f. 10v)
WN06_NOTE = (10, 10, 1240, 1530)       # the working note itself (f. 11r)
WN06_HALF_FRONT = (1225, 0, 1235, 830)  # attached half-sheet, front (f. 11r)
WN06_HALF_BACK = (20, 160, 1225, 810)   # attached half-sheet, back (f. 11v)


def placed(region, source_height):
    """Where a region lands on the canvas of the whole image rotated 90°."""
    x, y, w, h = region
    return (source_height - y - h, x, h, w)


def options():
    wn04 = rotated_size(*SIZES["2012FE1488"], 90)       # 1875 x 2500
    wn05 = rotated_size(*SIZES["2012FE1496"], 90)       # 2500 x 1875
    wn05v = rotated_size(*SIZES["2026PR3250"], 90)      # 1830 x 2500
    wn06 = rotated_size(*SIZES["2012FE1494"], 90)       # 1553 x 2500
    under = image("2026PR3250", 90, WN05_UNDERSIDE, "Half-sheet underside (V&A f. 10v, cropped, rotated 90°)")
    front = image("2012FE1494", 90, WN06_HALF_FRONT, "Half-sheet front (V&A f. 11r, cropped, rotated 90°)")
    back = image("2012FE1489", 270, WN06_HALF_BACK, "Half-sheet back (V&A f. 11v, cropped, rotated 270°)")
    h04 = SIZES["2012FE1488"][1]
    h06 = SIZES["2012FE1494"][1]

    canvases = [
        # DS WN 04: non-rectangular note
        canvas("proto-ds-wn-04-a", "WN 04 · A: whole image", wn04,
               [(image("2012FE1488", 90), None)], thumb("2012FE1488", 90)),
        canvas("proto-ds-wn-04-b", "WN 04 · B: two crops (IIIF)", wn04,
               [(image("2012FE1488", 90, WN04_UPPER, "Upper sheet (cropped)"), placed(WN04_UPPER, h04)),
                (image("2012FE1488", 90, WN04_LOWER, "Lower strip (cropped)"), placed(WN04_LOWER, h04))],
               thumb("2012FE1488", 90)),
        canvas("proto-ds-wn-04-c", "WN 04 · C: cut-out (not IIIF)", wn04,
               [(local_image("img/ds-wn-04-cutout.webp", *wn04,
                             "Cut out along the paper edge (processed copy of V&A f. 9r)"), None)],
               thumb("2012FE1488", 90)),
        # DS WN 05: half-sheet pasted on, writing on its underside
        canvas("proto-ds-wn-05-a", "WN 05 · A: note (f. 10r)", wn05,
               [(image("2012FE1496", 90), None)], thumb("2012FE1496", 90)),
        canvas("proto-ds-wn-05-b", "WN 05 · B: whole verso photo", wn05v,
               [(image("2026PR3250", 90), None)], thumb("2026PR3250", 90)),
        canvas("proto-ds-wn-05-c", "WN 05 · C: underside only", (under["width"], under["height"]),
               [(under, None)], thumb("2026PR3250", 90, WN05_UNDERSIDE)),
        canvas("proto-ds-wn-05-d", "WN 05 · D: note + underside", (wn05[0] + 60 + under["width"], wn05[1]),
               [(image("2012FE1496", 90), (0, 0, *wn05)),
                (under, (wn05[0] + 60, (wn05[1] - under["height"]) // 2, under["width"], under["height"]))],
               thumb("2012FE1496", 90)),
        # DS WN 06: half-sheet (archivists' attachment) with writing front and back
        canvas("proto-ds-wn-06-a", "WN 06 · A: whole image", wn06,
               [(image("2012FE1494", 90), None)], thumb("2012FE1494", 90)),
        canvas("proto-ds-wn-06-b", "WN 06 · B: note only", rotated_size(*WN06_NOTE[2:], 90),
               [(image("2012FE1494", 90, WN06_NOTE), None)], thumb("2012FE1494", 90, WN06_NOTE)),
        canvas("proto-ds-wn-06-c", "WN 06 · C: half-sheet front + back", (front["width"] + 40 + back["width"], front["height"]),
               [(front, (0, 0, front["width"], front["height"])),
                (back, (front["width"] + 40, 0, back["width"], back["height"]))],
               thumb("2012FE1494", 90, WN06_HALF_FRONT)),
        canvas("proto-ds-wn-06-d", "WN 06 · D: turn the half-sheet over (layers)", wn06,
               [(image("2012FE1494", 90), None),
                # Plain stacked layers, front on top: hide it to see the back.
                # (An oa:Choice would start with the back hidden, but Mirador
                # 4.2.4 ignores #xywh for Choice items and fills the canvas.)
                (back, placed(WN06_HALF_FRONT, h06)),
                (front, placed(WN06_HALF_FRONT, h06))],
               thumb("2012FE1494", 90)),
    ]
    return manifest("hard-cases", "Hard cases: display options",
                    "Display options for the non-standard Dombey and Son images (DS WN 04, 05, 06).", canvases)


def book():
    """DS WN 06 as separate pages, for Mirador's book view."""
    front = image("2012FE1494", 90, WN06_HALF_FRONT, "Half-sheet front (V&A f. 11r, cropped, rotated 90°)")
    back = image("2012FE1489", 270, WN06_HALF_BACK, "Half-sheet back (V&A f. 11v, cropped, rotated 270°)")
    note = image("2012FE1494", 90, WN06_NOTE)
    canvases = [
        canvas("proto-ds-wn-06-e-note", "WN 06 note", (note["width"], note["height"]),
               [(note, None)], thumb("2012FE1494", 90, WN06_NOTE)),
        canvas("proto-ds-wn-06-e-front", "Half-sheet front", (front["width"], front["height"]),
               [(front, None)], thumb("2012FE1494", 90, WN06_HALF_FRONT)),
        canvas("proto-ds-wn-06-e-back", "Half-sheet back", (back["width"], back["height"]),
               [(back, None)], thumb("2012FE1489", 270, WN06_HALF_BACK)),
    ]
    return manifest("hard-cases-book", "Hard cases: DS WN 06 in book view",
                    "DS WN 06 and its attached half-sheet as separate pages; switch the window to book view to see the half-sheet's front and back as a spread.",
                    canvases, paged=True)


if __name__ == "__main__":
    out = Path(sys.argv[1])
    for name, data in (("hard-cases.json", options()), ("hard-cases-book.json", book())):
        (out / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(out / name, len(data["sequences"][0]["canvases"]), "canvases")
