"""Build the Hard Times manifest for the editor test.

Six canvases (General Mems, WN 01-05), each with two layers:

- the V&A manuscript photograph, through the V&A image service (tiled, so
  deep zoom works to the full 5440 px), and
- Adam's realigned transcription (Drive: "HT aligned JPEGS for website",
  2026-10-31), made at the canvas size, 2500 x 1875.

Only V&A image URLs are used, never V&A manifests. Folios were matched by
comparing Adam's Drive scans with every image in the V&A volume: folios 4
and 5 are second photographs of WN 01 and WN 02 (folios 2 and 3), so the
notes for Nos. III-V are on folios 6, 7 and 8.

    python3 scripts/prototype/build_hard_times.py public/iiif/prototype
"""
import json
import sys
from pathlib import Path

V = "https://framemark.vam.ac.uk/collections"
CANVAS_BASE = "https://dickensnotes.github.io/dickens-annotations/canvas/prototype"
SITE = "https://www.dickensnotes.com/iiif/prototype"

CANVAS_W, CANVAS_H = 2500, 1875
VAM_W, VAM_H = 5440, 4080  # from each image's info.json

# (canvas name, label, V&A image id, folio, transcription file)
NOTES = [
    ("ht-vam-mems", "HT General Mems", "2012FG2678", "1r", "ht-mems.jpg"),
    ("ht-vam-wn-01", "HT WN 01 (No. I)", "2012FG2679", "2r", "ht-wn-01.jpg"),
    ("ht-vam-wn-02", "HT WN 02 (No. II)", "2012FG2680", "3r", "ht-wn-02.jpg"),
    ("ht-vam-wn-03", "HT WN 03 (No. III)", "2012FG2694", "6r", "ht-wn-03.jpg"),
    ("ht-vam-wn-04", "HT WN 04 (No. IV)", "2012FG2685", "7r", "ht-wn-04.jpg"),
    ("ht-vam-wn-05", "HT WN 05 (Nos. V-VI)", "2012FG2684", "8r", "ht-wn-05.jpg"),
]


def painting(canvas_id, resource):
    return {"@type": "oa:Annotation", "motivation": "sc:painting", "on": canvas_id, "resource": resource}


def manuscript(vam_id, folio):
    return {
        "@id": f"{V}/{vam_id}/full/full/0/default.jpg",
        "@type": "dctypes:Image",
        "label": f"Manuscript (V&A, Forster MS 163, f. {folio})",
        "format": "image/jpeg",
        "width": VAM_W,
        "height": VAM_H,
        "service": {
            "@context": "http://iiif.io/api/image/2/context.json",
            "@id": f"{V}/{vam_id}",
            "profile": "http://iiif.io/api/image/2/level1.json",
        },
    }


def transcription(filename):
    # Site-relative so it loads on any host (preview, local); a real edition
    # would host these at a permanent absolute URL
    return {
        "@id": f"/iiif/prototype/img/hard-times/{filename}",
        "@type": "dctypes:Image",
        "label": "Transcription",
        "format": "image/jpeg",
        "width": CANVAS_W,
        "height": CANVAS_H,
    }


def canvas(name, label, vam_id, folio, filename):
    cid = f"{CANVAS_BASE}/{name}.json"
    return {
        "@id": cid,
        "@type": "sc:Canvas",
        "label": label,
        "width": CANVAS_W,
        "height": CANVAS_H,
        "thumbnail": {"@id": f"{V}/{vam_id}/full/200,/0/default.jpg", "@type": "dctypes:Image"},
        "images": [painting(cid, manuscript(vam_id, folio)), painting(cid, transcription(filename))],
    }


def main(out_dir):
    manifest = {
        "@context": "http://iiif.io/api/presentation/2/context.json",
        "@id": f"{SITE}/hard-times.json",
        "@type": "sc:Manifest",
        "label": "Hard Times: V&A images",
        "description": (
            "Hard Times Working Notes on the V&A manuscript photographs, with the realigned "
            "transcriptions as a layer. Use the Layers panel to fade between them."
        ),
        "attribution": "Manuscript images © Victoria and Albert Museum, London",
        "sequences": [{"@type": "sc:Sequence", "canvases": [canvas(*n) for n in NOTES]}],
    }
    path = Path(out_dir) / "hard-times.json"
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "public/iiif/prototype")
