# Multi-Layer IIIF Test - Bleak House Working Notes No. 5

## What We Built

This test demonstrates multi-layer IIIF Presentation API 3.0 with:
- **Manuscript photo layer**: Original photograph of BH Working Notes page spread
- **Transcription overlay**: Existing typed transcription that aligns with the manuscript

## Files Created

1. **BH_WN_No5.jpg** - Original page spread photo (3055x2415px)
2. **BH_WN_05_page_0.jpg** - Left page split (general notes)
3. **BH_WN_05_page_1.jpg** - Right page split (chapters XIV-XVII)
4. **BH_WN_05_manuscript.jpg** - Right page resized to 2700x2100px
5. **BHWN05_transcription.jpg** - Downloaded transcription (2700x2100px)
6. **manifest.json** - IIIF Presentation API 3.0 manifest with multi-layer support

## How to View

### Local Test (Current Setup)

1. **HTTP Server** running on port 8000:
   ```bash
   cd /Users/scott/projects/ddnp
   python3 -m http.server 8000
   ```

2. **Astro Dev Server** running on port 4321:
   ```bash
   pnpm dev
   ```

3. **View in browser**:
   - Primary: http://localhost:4321/test-multilayer
   - With composition example: http://localhost:4321/test-multilayer?manifest=composition
   - With coin example: http://localhost:4321/test-multilayer?manifest=coin

### Using Mirador Layer Controls

In the Mirador viewer you should see:
- **Layer icon** in the toolbar (looks like stacked squares)
- Click it to toggle between:
  - Manuscript photo only
  - Transcription only
  - Both layers (overlaid)
- **Opacity slider** to adjust transparency of each layer

## Technical Details

### IIIF Manifest Structure

The manifest uses Presentation API 3.0 with:
```json
"items": [
  {
    "id": "...",
    "type": "AnnotationPage",
    "items": [
      { "motivation": "painting", "body": { ... manuscript image ... } },
      { "motivation": "painting", "body": { ... transcription image ... } }
    ]
  }
]
```

**Key Points**:
- Both images have `motivation: "painting"`
- Both target the same canvas
- The **last image appears on top** (z-index)
- Each layer can have a `label` for display in UI

### Image Alignment Process

1. **Split page spread**: Used ImageMagick to crop 50% left/right
2. **Download reference**: Fetched existing transcription from dickensnotes.github.io
3. **Resize to match**: Resized manuscript to 2700x2100px (same as transcription)
4. **Create manifest**: Built IIIF v3 manifest with both as painting annotations

## Next Steps for Production

### 1. Fine-tune Alignment

The current manuscript image may need perspective correction:
```bash
# Option A: Manual alignment in GIMP
# - Open both images as layers
# - Use transform tools to align registration points
# - Export aligned manuscript layer

# Option B: Automated with OpenCV (Python)
# - Detect feature points in both images
# - Calculate transformation matrix
# - Warp manuscript to match transcription
```

### 2. Add Annotation References

The manifest can reference existing annotations:
```json
"annotations": [
  {
    "id": "https://dickensnotes.github.io/.../bhwn05-list.json",
    "type": "AnnotationPage"
  }
]
```

### 3. Create IIIF Image Services

For production, convert static JPEGs to IIIF image services:
- Use Cantaloupe, IIPImage, or similar IIIF image server
- Generate pyramidal TIFFs for better zooming
- Update manifest to reference image services instead of static images

### 4. Process All Pages

Repeat for all Bleak House working notes:
```bash
for i in {01..20}; do
  # Split page spread
  # Download existing transcription
  # Align images
  # Create/update manifest
done
```

### 5. Migrate to v3

Update existing manifests from Presentation API 2.0 to 3.0:
```bash
# Using the official IIIF migration tool
prezi-upgrade old-manifest.json > new-manifest.json
```

See `IIIF_MIGRATION_GUIDE.md` for full migration details.

## Workflow Summary

```
1. Photo page spread (camera/scanner)
   └─> BH_WN_No5.jpg
       │
       ├─> Split image (ImageMagick)
       │   └─> BH_WN_05_page_0.jpg (left)
       │   └─> BH_WN_05_page_1.jpg (right)
       │
       ├─> Resize to standard dimensions
       │   └─> BH_WN_05_manuscript.jpg (2700x2100)
       │
       ├─> Download existing transcription
       │   └─> BHWN05_transcription.jpg (2700x2100)
       │
       └─> Create IIIF manifest
           └─> manifest.json (multi-layer v3)
               │
               └─> View in Mirador
                   └─> Toggle layers, adjust opacity
```

## Troubleshooting

### Layers not visible in Mirador

- Check browser console for CORS errors
- Verify both images load: http://localhost:8000/test-images/BH_WN_05_manuscript.jpg
- Check manifest validates: https://presentation-validator.iiif.io/

### Images don't align

- Both images must be same dimensions (2700x2100)
- May need perspective correction on manuscript photo
- Use GIMP/Photoshop to manually align registration points

### Server not running

```bash
# Check if HTTP server is running
curl http://localhost:8000/test-images/manifest.json

# Check if Astro is running
curl http://localhost:4321/test-multilayer

# Restart if needed
cd /Users/scott/projects/ddnp
python3 -m http.server 8000 &
pnpm dev
```

## References

- [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/)
- [IIIF Cookbook: Composition from Multiple Images](https://iiif.io/api/cookbook/recipe/0036-composition-from-multiple-images/)
- [Mirador Documentation](https://projectmirador.org/)
- [ImageMagick Documentation](https://imagemagick.org/index.php)
