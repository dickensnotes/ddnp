# Multi-Layer IIIF Implementation - Complete Workflow

## Session Summary (2026-01-23)

Successfully implemented and tested a multi-layer IIIF manifest combining manuscript photographs with existing transcriptions, including full annotation support.

---

## What We Built

### Multi-Layer IIIF Manifest for Bleak House Working Notes No. 5

A working prototype demonstrating:
- ✅ **Two aligned image layers** (manuscript photo + transcription)
- ✅ **IIIF Presentation API 3.0** manifest structure
- ✅ **Existing annotations** displayed across both layers
- ✅ **Layer toggling** in Mirador viewer
- ✅ **Local testing environment** with live preview

---

## File Structure

```
ddnp/
├── test-images/                          # Source images and processing
│   ├── BH_WN_No5.jpg                    # Original photo (3055x2415)
│   ├── BH_WN_05_page_0.jpg              # Left page (not used)
│   ├── BH_WN_05_page_1.jpg              # Right page (not used)
│   ├── BHWN05_transcription.jpg         # Downloaded transcription
│   ├── manifest.json                    # Initial test manifest
│   ├── README.md                        # General documentation
│   └── MULTILAYER_WORKFLOW.md           # This file
│
├── public/test-iiif/                    # Production test files (served by Astro)
│   ├── BH_WN_05_manuscript.jpg          # Full spread resized to 2700x2100
│   ├── BHWN05_transcription.jpg         # Transcription at 2700x2100
│   └── manifest.json                    # Working v3 manifest with annotations
│
└── src/pages/test-multilayer.astro      # Test viewer page
```

---

## Complete Workflow

### 1. Image Acquisition

**Input:** Page spread photograph from physical archive
- File: `BH_WN_No5.jpg`
- Original dimensions: 3055 × 2415 pixels
- Format: JPEG photograph of two-page spread

**Key Insight:** The transcription images are already two-page spreads, so no splitting needed.

### 2. Image Processing

**Step 1: Download existing transcription**
```bash
curl "https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif/bleakhousetranscriptions/BHWN05/full/full/0/default.jpg" \
  -o test-images/BHWN05_transcription.jpg
```

**Step 2: Check transcription dimensions**
```bash
identify test-images/BHWN05_transcription.jpg
# Output: 2700x2100 pixels
```

**Step 3: Resize manuscript photo to match**
```bash
magick test-images/BH_WN_No5.jpg \
  -resize 2700x2100! \
  public/test-iiif/BH_WN_05_manuscript.jpg
```

**Note:** The `!` flag forces exact dimensions (ignores aspect ratio). For production, you may want to:
- Crop to same aspect ratio first
- Apply perspective correction
- Use manual alignment in GIMP/Photoshop

### 3. IIIF Manifest Creation

**Created:** `public/test-iiif/manifest.json`

**Key Structure:**
```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "http://localhost:4321/test-iiif/manifest.json",
  "type": "Manifest",
  "items": [
    {
      "id": "https://dickensnotes.github.io/.../BHWN05.json",
      "type": "Canvas",
      "height": 2100,
      "width": 2700,
      "items": [
        {
          "type": "AnnotationPage",
          "items": [
            {
              "motivation": "painting",
              "body": { ... manuscript image ... }
            },
            {
              "motivation": "painting",
              "body": { ... transcription image ... }
            }
          ]
        }
      ],
      "annotations": [
        {
          "id": "https://dickensnotes.github.io/.../bhwn05-list.json",
          "type": "AnnotationPage"
        }
      ]
    }
  ]
}
```

**Critical Details:**

1. **Canvas ID must match annotation expectations:**
   ```json
   "id": "https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/BHWN05.json"
   ```
   This ensures existing v2 annotations target the correct canvas.

2. **Layer order matters:**
   - First image in `items[]` = bottom layer (manuscript)
   - Last image in `items[]` = top layer (transcription)

3. **Both images have `motivation: "painting"`:**
   This tells Mirador they're both renderings of the canvas content

4. **Annotations reference external AnnotationPage:**
   ```json
   "annotations": [
     {
       "id": "https://dickensnotes.github.io/dickens-annotations/annotations/bhwn05-list.json",
       "type": "AnnotationPage"
     }
   ]
   ```

### 4. Test Page Configuration

**Updated:** `src/pages/test-multilayer.astro`

**Changes:**
```javascript
// Added local manifest to test options
const manifests = {
  local: "/test-iiif/manifest.json",  // <- New
  composition: "https://iiif.io/api/cookbook/...",
  coin: "https://gist.githubusercontent.com/..."
};

// Changed default to local
const manifestType = urlParams.get("manifest") || "local";
```

### 5. Local Testing Setup

**Servers Required:**

1. **Astro Dev Server** (port 4321)
   ```bash
   cd /Users/scott/projects/ddnp
   pnpm dev
   ```
   - Serves the viewer application
   - Serves static files from `public/`
   - No CORS issues (same origin)

2. ~~Python HTTP Server~~ (not needed - eliminated CORS issues by using Astro's public/ directory)

**Access Points:**
- Main test: http://localhost:4321/test-multilayer
- With IIIF cookbook example: http://localhost:4321/test-multilayer?manifest=composition
- With coin example: http://localhost:4321/test-multilayer?manifest=coin

---

## Testing Results

### ✅ What Works

1. **Layer Display**
   - Both manuscript and transcription load correctly
   - Layers can be toggled on/off independently
   - Opacity slider adjusts transparency
   - Layer labels appear in UI ("Manuscript Photo", "Transcription Overlay")

2. **Annotations**
   - Existing BHWN05 annotations display on the canvas
   - Annotation boxes appear in correct positions
   - Click to view annotation content
   - Annotations remain visible when toggling layers

3. **IIIF v2/v3 Compatibility**
   - v3 manifest successfully references v2 annotation lists
   - Mirador 4.0 handles the mixed version correctly
   - No need to convert annotations to v3 immediately

### 🔧 Known Limitations

1. **Image Alignment**
   - Simple resize (`-resize 2700x2100!`) distorts aspect ratio
   - Manuscript photo may need perspective correction
   - Fine-tuning required for pixel-perfect alignment

2. **Static Images vs. IIIF Image API**
   - Currently using static JPEGs
   - Production should use IIIF Image API (with tiles)
   - Enables better zooming and performance

3. **Canvas ID Consistency**
   - Canvas IDs must match existing annotation targets
   - Changing IDs would break annotation references
   - Consider this in production URL structure

---

## Production Roadmap

### Phase 1: Image Processing Pipeline

**For each page:**

1. **Acquire manuscript photos**
   - Scan or photograph at high resolution
   - Consistent lighting and angle
   - Minimal perspective distortion

2. **Download existing transcriptions**
   ```bash
   curl "https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif/bleakhousetranscriptions/BHWN{01-20}/full/full/0/default.jpg" \
     -o "transcriptions/BHWN{01-20}.jpg"
   ```

3. **Align images**
   - Option A: Batch processing with ImageMagick
   - Option B: Manual alignment in GIMP (more accurate)
   - Option C: Automated feature detection with OpenCV

4. **Quality check**
   - Overlay in image editor
   - Verify registration points align
   - Check annotation box placement

### Phase 2: IIIF Image Service Setup

**Choose an image server:**

- **Cantaloupe** (Java, popular, easy setup)
- **IIPImage** (C++, high performance)
- **Loris** (Python, simpler)
- **SIPI** (research-grade, Swiss National Data & Service Center)

**Benefits:**
- Tiled image delivery (faster loading)
- Dynamic resizing and rotation
- Better zoom performance
- Reduced bandwidth

**Image preparation:**
```bash
# Convert to pyramidal TIFF for best performance
magick BH_WN_05_manuscript.jpg \
  -define tiff:tile-geometry=256x256 \
  -compress jpeg \
  'ptif:BH_WN_05_manuscript.tif'
```

**Manifest update:**
```json
"body": {
  "id": "https://iiif.dickensnotes.com/iiif/2/BHWN05_manuscript/full/full/0/default.jpg",
  "type": "Image",
  "format": "image/jpeg",
  "service": [
    {
      "id": "https://iiif.dickensnotes.com/iiif/2/BHWN05_manuscript",
      "type": "ImageService2",
      "profile": "level2"
    }
  ]
}
```

### Phase 3: Manifest Generation

**Script approach:**

```bash
#!/bin/bash
# generate-multilayer-manifests.sh

for i in {01..20}; do
  PAGE="BHWN$(printf '%02d' $i)"

  # Create manifest for each page
  cat > "manifests/${PAGE}_manifest.json" <<EOF
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://dickensnotes.com/manifests/${PAGE}.json",
  "type": "Manifest",
  "label": { "en": ["Bleak House Working Notes No. $i"] },
  "items": [
    {
      "id": "https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/${PAGE}.json",
      "type": "Canvas",
      "height": 2100,
      "width": 2700,
      "items": [ /* image layers */ ],
      "annotations": [
        {
          "id": "https://dickensnotes.github.io/dickens-annotations/annotations/$(echo ${PAGE} | tr '[:upper:]' '[:lower:]')-list.json",
          "type": "AnnotationPage"
        }
      ]
    }
  ]
}
EOF
done
```

**Or use a proper tool:**
- [iiif-prezi3](https://github.com/iiif-prezi/iiif-prezi3) (Python library)
- [Tify](https://github.com/tify-iiif-viewer/tify) (JavaScript)
- Custom script in your preferred language

### Phase 4: Migration to v3

**Option A: Keep v2 Annotations**
- v3 manifests can reference v2 annotation lists
- Mirador 4 handles this gracefully
- No need to convert immediately
- Migrate annotations later at leisure

**Option B: Convert Annotations to v3**
```bash
# Using official IIIF migration tool
for file in annotations/*-list.json; do
  prezi-upgrade "$file" > "${file%.json}_v3.json"
done
```

**Recommendation:** Option A for faster deployment, Option B for long-term maintainability.

### Phase 5: Integration with Existing Site

**Update page templates:**

```astro
---
// src/pages/notes/bleak-house/mirador.astro

// Option 1: Add URL parameter for layer view
const useMultiLayer = Astro.url.searchParams.get("layers") === "true";

const manifest = useMultiLayer
  ? "https://dickensnotes.com/manifests/multilayer/bleak-house.json"
  : "https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif/bleakhousetranscriptions/manifest.json";

// Option 2: Toggle in UI
const enableLayers = true; // Feature flag
---
```

**UI Considerations:**
- Add "View with manuscript photos" toggle
- Explain layer controls to users
- Provide documentation/tutorial
- Consider default layer visibility (manuscript only? both? transcription only?)

---

## Technical Notes

### IIIF Presentation API v2 vs v3

**Why we used v3 for the manifest:**
- Better multi-layer support (`items[]` structure)
- More flexible annotation architecture
- Future-proof (v2 is deprecated)
- Still compatible with v2 annotations

**Key v3 Features Used:**

1. **Language Maps:**
   ```json
   "label": { "en": ["Bleak House Working Notes No. 5"] }
   ```
   All text values use this structure (enables internationalization)

2. **Items Array:**
   ```json
   "items": [...]  // Direct array of canvases (no "sequences")
   ```

3. **AnnotationPage Type:**
   ```json
   "type": "AnnotationPage"  // Not "sc:AnnotationList"
   ```

4. **Painting Motivation:**
   ```json
   "motivation": "painting"  // Not "sc:painting"
   ```

### Annotation Targeting

**Critical:** Annotations use `xywh=` fragment selectors:

```json
"selector": {
  "@type": "oa:FragmentSelector",
  "value": "xywh=1394,4,1180,92"
}
```

**Coordinates are canvas-relative:**
- x=1394, y=4 (top-left corner)
- w=1180, h=92 (width and height)

**These coordinates work across both layers** because:
1. Both images have same dimensions (2700×2100)
2. Both target the same canvas
3. Annotations target the canvas, not specific images

**This means:**
- ✅ Annotations appear correctly on both layers
- ✅ No need to duplicate annotations per layer
- ✅ Toggle layers while keeping annotations visible
- ⚠️ Image alignment must be precise for annotations to match visual features

### CORS and Same-Origin Policy

**Why we moved files to `public/test-iiif/`:**

Initial setup had:
- Astro dev server: `localhost:4321`
- Python HTTP server: `localhost:8000`
- Result: CORS errors when Mirador tried to fetch manifest

**Solution:**
- Move all test files to `public/test-iiif/`
- Astro serves everything from same origin
- No CORS configuration needed
- Simpler deployment

**For production:**
- All resources should be same-origin OR
- Configure proper CORS headers:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET
  ```

---

## Replication Guide

### To Create Multi-Layer Manifest for Another Page

**Example: David Copperfield Working Notes No. 3**

1. **Prepare manuscript photo:**
   ```bash
   # Place photo in test-images/
   cp ~/photos/DC_WN_No3.jpg test-images/
   ```

2. **Download existing transcription:**
   ```bash
   curl "https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif/davidcopperfieldtranscription/dcwn03/full/full/0/default.jpg" \
     -o public/test-iiif/dcwn03_transcription.jpg
   ```

3. **Resize manuscript to match:**
   ```bash
   magick test-images/DC_WN_No3.jpg \
     -resize 2700x2100! \
     public/test-iiif/dcwn03_manuscript.jpg
   ```

4. **Create manifest:**
   ```bash
   # Copy and modify existing manifest
   cp public/test-iiif/manifest.json public/test-iiif/dcwn03_manifest.json

   # Update:
   # - All "BHWN05" -> "dcwn03"
   # - Canvas ID to match David Copperfield structure
   # - Annotation list URL
   # - Labels and metadata
   ```

5. **Test:**
   ```
   http://localhost:4321/test-multilayer?manifest=/test-iiif/dcwn03_manifest.json
   ```

### Batch Processing Script Template

```bash
#!/bin/bash
# batch-process-multilayer.sh

NOVEL="bleak-house"
BASE_URL="https://dickensnotes.github.io/dickens-annotations"
PAGES=(01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20)

for PAGE_NUM in "${PAGES[@]}"; do
  echo "Processing ${NOVEL} page ${PAGE_NUM}..."

  # Define paths
  PHOTO_SOURCE="photos/${NOVEL}/page_${PAGE_NUM}.jpg"
  TRANS_URL="${BASE_URL}/img/derivatives/iiif/bleakhousetranscriptions/BHWN${PAGE_NUM}/full/full/0/default.jpg"
  MANUSCRIPT_OUT="public/iiif/${NOVEL}/BHWN${PAGE_NUM}_manuscript.jpg"
  TRANS_OUT="public/iiif/${NOVEL}/BHWN${PAGE_NUM}_transcription.jpg"

  # Download transcription
  curl -s "$TRANS_URL" -o "$TRANS_OUT"

  # Resize manuscript
  magick "$PHOTO_SOURCE" -resize 2700x2100! "$MANUSCRIPT_OUT"

  # Generate manifest (using template or script)
  # ...

  echo "✓ Completed page ${PAGE_NUM}"
done

echo "All pages processed!"
```

---

## Quality Assurance Checklist

### Before Deploying a Multi-Layer Manifest

- [ ] **Image Alignment**
  - [ ] Both images same dimensions
  - [ ] Visual features align (corners, text, lines)
  - [ ] Test with 50% opacity overlay in image editor
  - [ ] Annotations align with manuscript features

- [ ] **Manifest Validation**
  - [ ] Passes IIIF validator: https://presentation-validator.iiif.io/
  - [ ] Canvas IDs match annotation targets
  - [ ] Image URLs resolve correctly
  - [ ] Annotation list URLs resolve correctly

- [ ] **Mirador Testing**
  - [ ] Both layers load
  - [ ] Layer toggle works
  - [ ] Opacity slider works
  - [ ] Annotations display correctly
  - [ ] Annotations clickable and readable
  - [ ] Zoom works smoothly
  - [ ] No console errors

- [ ] **Cross-Browser Testing**
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari
  - [ ] Mobile browsers

- [ ] **Performance**
  - [ ] Images load in reasonable time
  - [ ] No lag when toggling layers
  - [ ] Zoom performance acceptable

- [ ] **Metadata**
  - [ ] Labels accurate
  - [ ] Attribution correct
  - [ ] Rights statement present
  - [ ] Summary descriptive

---

## Lessons Learned

### What Worked Well

1. **Using existing transcription dimensions as target**
   - Avoided having to define new standard
   - Ensures compatibility with existing annotations
   - Simplifies alignment process

2. **IIIF v3 with v2 annotations**
   - No need to convert everything at once
   - Mirador handles mixed versions gracefully
   - Can migrate incrementally

3. **Local testing in Astro's public/ directory**
   - Eliminates CORS issues
   - Fast iteration
   - Easy to share (just commit to git)

4. **Canvas ID consistency**
   - Keeping existing canvas IDs ensures annotations work
   - Critical for maintaining deep links
   - No need to update annotation files

### Challenges Encountered

1. **Initial CORS issues**
   - Solved by moving to Astro's public/ directory
   - Lesson: Plan for same-origin serving early

2. **Understanding layer order**
   - Last item in `items[]` array appears on top
   - Counter-intuitive but documented in IIIF spec

3. **Aspect ratio distortion**
   - Simple resize changes aspect ratio
   - Need better image processing for production
   - Consider perspective correction tools

### Recommendations

1. **For Production:**
   - Invest in proper image alignment (GIMP/Photoshop or automated)
   - Use IIIF image server for better performance
   - Create script for batch processing
   - Test extensively before deployment

2. **For User Experience:**
   - Default to transcription layer (more readable)
   - Provide clear instructions for layer toggle
   - Consider tutorial/help overlay
   - Add keyboard shortcuts for layer toggle

3. **For Maintenance:**
   - Document image processing steps
   - Keep source images at highest resolution
   - Version control manifests
   - Use consistent naming conventions

---

## Next Steps

### Immediate (Before Full Deployment)

1. **Fine-tune alignment for BHWN05**
   - Use GIMP to manually align registration points
   - Export aligned manuscript layer
   - Test annotation alignment

2. **Process 2-3 more pages**
   - Validate workflow scales
   - Identify edge cases
   - Refine batch processing approach

3. **User testing**
   - Show to project stakeholders
   - Gather feedback on layer UI
   - Assess scholarly value

### Short-term (Next Sprint)

1. **Choose IIIF image server**
   - Evaluate options (Cantaloupe, IIPImage, Loris)
   - Set up test instance
   - Convert sample images to pyramidal TIFF

2. **Create batch processing pipeline**
   - Script for image acquisition
   - Automated alignment (or manual workflow)
   - Manifest generation script

3. **Documentation for users**
   - How to use layer toggle
   - Scholarly applications
   - Citation guidelines for manuscript photos

### Long-term (Next Quarter)

1. **Process all Bleak House pages (20 total)**
   - Apply refined workflow
   - Quality assurance for each
   - Deploy to staging

2. **Extend to other novels**
   - David Copperfield (19 pages)
   - Little Dorrit (20 pages)
   - Hard Times (20 pages)

3. **Consider additional layers**
   - Draft manuscript pages
   - Variant transcriptions
   - Enhanced/corrected transcriptions
   - Facsimile editions

4. **Advanced features**
   - Side-by-side comparison view
   - Annotation filtering by layer
   - Synchronized scrolling
   - Export options

---

## Resources & References

### Documentation Created

- `test-images/README.md` - General multi-layer setup guide
- `test-images/MULTILAYER_WORKFLOW.md` - This document
- `IIIF_MIGRATION_GUIDE.md` - Full v2 to v3 migration guide

### IIIF Specifications

- [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/)
- [IIIF Image API 2.1](https://iiif.io/api/image/2.1/)
- [Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)

### IIIF Cookbook Recipes

- [Recipe 0036: Composition from Multiple Images](https://iiif.io/api/cookbook/recipe/0036-composition-from-multiple-images/)
- [Recipe 0326: Annotating Specific Images or Layers](https://iiif.io/api/cookbook/recipe/0326-annotating-image-layer/)

### Tools Used

- **ImageMagick** - Image processing and resizing
- **Mirador 4.0** - IIIF viewer with layer support
- **Astro** - Static site framework
- **curl/jq** - Testing and validation

### Useful Links

- [Mirador Documentation](https://projectmirador.org/)
- [IIIF Presentation Validator](https://presentation-validator.iiif.io/)
- [IIIF Community Slack](https://iiif.io/community/#join-us)

---

## Appendix: Example Manifest (Complete)

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "http://localhost:4321/test-iiif/manifest.json",
  "type": "Manifest",
  "label": {
    "en": ["Bleak House Working Notes No. 5 - Multi-Layer Test"]
  },
  "summary": {
    "en": ["Testing multi-layer IIIF with manuscript photo and transcription overlay"]
  },
  "rights": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "requiredStatement": {
    "label": {
      "en": ["Attribution"]
    },
    "value": {
      "en": ["© Digital Dickens Notes Project (DDNP) 2022 - Multi-layer test"]
    }
  },
  "items": [
    {
      "id": "https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/BHWN05.json",
      "type": "Canvas",
      "label": {
        "en": ["BH Working Notes No. 5"]
      },
      "height": 2100,
      "width": 2700,
      "items": [
        {
          "id": "http://localhost:4321/test-iiif/page/bhwn05/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "http://localhost:4321/test-iiif/annotation/bhwn05-manuscript",
              "type": "Annotation",
              "motivation": "painting",
              "label": {
                "en": ["Manuscript Photo"]
              },
              "body": {
                "id": "http://localhost:4321/test-iiif/BH_WN_05_manuscript.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "height": 2100,
                "width": 2700,
                "label": {
                  "en": ["Manuscript Layer"]
                }
              },
              "target": "https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/BHWN05.json"
            },
            {
              "id": "http://localhost:4321/test-iiif/annotation/bhwn05-transcription",
              "type": "Annotation",
              "motivation": "painting",
              "label": {
                "en": ["Transcription Overlay"]
              },
              "body": {
                "id": "http://localhost:4321/test-iiif/BHWN05_transcription.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "height": 2100,
                "width": 2700,
                "label": {
                  "en": ["Transcription Layer"]
                }
              },
              "target": "https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/BHWN05.json"
            }
          ]
        }
      ],
      "annotations": [
        {
          "id": "https://dickensnotes.github.io/dickens-annotations/annotations/bhwn05-list.json",
          "type": "AnnotationPage"
        }
      ]
    }
  ]
}
```

---

## Contact & Contribution

For questions about this implementation:
- **Repository Issues**: [dickensnotes/ddnp/issues](https://github.com/dickensnotes/ddnp/issues)
- **IIIF Community**: [IIIF Slack](https://iiif.io/community/#join-us)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Author:** Claude Code Session
**Status:** ✅ Tested and Working
