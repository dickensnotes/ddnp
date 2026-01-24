# IIIF Presentation API 2.0 to 3.0 Migration Guide

## For Digital Dickens Notes Project

This guide covers migrating the DDNP from IIIF Presentation API 2.0 to 3.0, with specific considerations for Annonatate-managed transcriptions and multi-layer image support.

---

## Table of Contents

1. [Overview](#overview)
2. [Why Migrate?](#why-migrate)
3. [About Annonatate](#about-annonatate)
4. [Key Changes: API 2.0 → 3.0](#key-changes-api-20--30)
5. [Migration Strategy](#migration-strategy)
6. [Testing Multi-Layer Support](#testing-multi-layer-support)
7. [Breaking Changes to Watch For](#breaking-changes-to-watch-for)
8. [Recommended Timeline](#recommended-timeline)
9. [Migration Checklist](#migration-checklist)
10. [Resources](#resources)

---

## Overview

### Current Setup

- **IIIF Presentation API**: Version 2.0
- **Mirador Version**: 4.0.0 (supports both v2 and v3)
- **Annotation Tool**: Annonatate
- **Content**: 4 novels with ~19 canvases each
- **Structure**: Manifests + annotation lists per canvas

### The Good News

**Mirador 4.0 supports both versions**: Your current setup won't break during migration. Mirador 4.0.0 supports both v2 and v3 Presentation APIs, with "v2 support being much more robust." This allows gradual migration.

**Your code is ready**: The `createindex-parseannotations.py` script already checks for both old (`@id`, `@type`, `resource`, `chars`) and new (`id`, `type`, `body`, `value`) annotation properties.

---

## Why Migrate?

While v2 works fine, v3 provides:

- **Better multi-layer support** (crucial for adding manuscript images!)
- **Improved annotation architecture** (AnnotationPage vs AnnotationList)
- **Standardized Web Annotation Data Model**
- **Better internationalization** support
- **Future-proofing** (v2 is deprecated)
- **Better tool support** going forward
- **Enhanced metadata structure** with `requiredStatement` and `rights`

---

## About Annonatate

[Annonatate](https://annonatate.fly.dev/) (developed by Niqui O'Neill at NCSU) is:

- An annotation server that writes to GitHub repositories
- Compatible with IIIF images and manifests
- Creates IIIF manifests and tiled images automatically
- Stores annotations publicly via GitHub Pages
- [Open source](https://github.com/annonatate/annonatate) and self-hostable

**Current Status**: Based on available documentation, Annonatate appears to use Presentation API 2.0 format, though newer versions may support v3. You should verify your instance's output.

---

## Key Changes: API 2.0 → 3.0

### Property Renames

```
@id               → id
@type             → type
viewingHint       → behavior
attribution       → requiredStatement
license           → rights
description       → summary
startCanvas       → start
contentLayer      → supplementary
```

**Why**: Enable JavaScript dot notation (`manifest.id` instead of `manifest['@id']`)

### Context URL

```json
// Old (v2)
"@context": "http://iiif.io/api/presentation/2/context.json"

// New (v3)
"@context": "http://iiif.io/api/presentation/3/context.json"
```

### Annotation Architecture Changes

#### AnnotationList → AnnotationPage

```json
// Old (v2)
{
  "@type": "sc:AnnotationList",
  "@id": "...dcwn01-list.json",
  "resources": [
    {
      "@type": "oa:Annotation",
      "resource": {
        "chars": "...",
        "@type": "cnt:ContentAsText"
      },
      "on": "canvas-id"
    }
  ]
}

// New (v3)
{
  "type": "AnnotationPage",
  "id": "...dcwn01-list.json",
  "items": [
    {
      "type": "Annotation",
      "body": {
        "value": "...",
        "type": "TextualBody"
      },
      "target": "canvas-id"
    }
  ]
}
```

#### Key Annotation Property Changes

- `resources` → `items`
- `resource` → `body`
- `on` → `target`
- `chars` → `value`
- `@type: "oa:Annotation"` → `type: "Annotation"`
- `@type: "cnt:ContentAsText"` → `type: "TextualBody"`

### Layer Removal

- **v2**: Had `Layer` class for grouping annotations
- **v3**: Uses standard `AnnotationCollection` instead
- **Property rename**: `contentLayer` → `supplementary`

### Canvas Structure

```json
// Old (v2)
{
  "sequences": [{
    "canvases": [...]
  }]
}

// New (v3)
{
  "items": [...]  // Canvases directly in items array
}
```

### External Annotation References

```json
// Old (v2)
{
  "otherContent": [
    { "@id": "dcwn01-list.json", "@type": "sc:AnnotationList" }
  ]
}

// New (v3)
{
  "annotations": [
    { "id": "dcwn01-list.json", "type": "AnnotationPage" }
  ]
}
```

### Always Require Arrays

In v3, properties that can have multiple values **must always be arrays**, even with one value:

```json
// Old (v2) - could be string or array
"label": "David Copperfield"

// New (v3) - must be structured
"label": {
  "en": ["David Copperfield"]
}
```

### Motivation Values

```json
// Old (v2)
"motivation": "sc:painting"

// New (v3)
"motivation": "painting"

// New in v3: supplementing (for transcriptions/commentary)
"motivation": "supplementing"
```

---

## Migration Strategy

### Phase 1: Assessment

#### 1. Check Annonatate's Output

Examine your existing annotations:

```bash
# Check main index
curl https://dickensnotes.github.io/dickens-annotations/ | jq '.annotations[0]'

# Check a specific annotation list
curl https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/dcwn01-list.json | jq '.'
```

Look for:
- Which context URL is used?
- Are properties named `@id`/`@type` or `id`/`type`?
- Are annotations in `resources` or `items`?
- What's the structure of annotation bodies?

#### 2. Inventory Your IIIF Resources

```
dickensnotes.github.io/dickens-annotations/
├── img/derivatives/iiif/
│   ├── bleakhousetranscriptions/
│   │   ├── manifest.json
│   │   └── BHWN01-list.json ... BHWN19-list.json
│   ├── davidcopperfieldtranscription/
│   │   ├── manifest.json
│   │   └── dcwn01-list.json ... dcwn19-list.json
│   ├── HardTimesTranscription/
│   │   ├── manifest.json
│   │   └── ...
│   └── littledorrittranscription/
│       ├── manifest.json
│       └── ...
```

#### 3. Check Annonatate Version

- When was your Annonatate instance last updated?
- Does it support exporting v3 manifests?
- Can it read v3 manifests for editing?

Check:
- [Annonatate website](https://annonatate.fly.dev/)
- [Annonatate GitHub](https://github.com/annonatate/annonatate)
- Your self-hosted version (if applicable)

### Phase 2: Use the Official Migration Tool

The IIIF Consortium provides [prezi-2-to-3](https://github.com/IIIF/prezi-2-to-3), an official migration tool.

#### Installation

```bash
# Option 1: Docker (recommended)
docker pull ghcr.io/iiif/prezi-2-to-3:latest

# Option 2: Python
pip install prezi-2-to-3

# Option 3: NPM
npm install -g @iiif/prezi-2-to-3
```

#### Basic Usage

```bash
# Convert a single manifest
prezi-upgrade manifest_v2.json > manifest_v3.json

# Using Docker
docker run -v $(pwd):/data ghcr.io/iiif/prezi-2-to-3 \
  /data/manifest_v2.json > /data/manifest_v3.json

# Convert annotation list
prezi-upgrade dcwn01-list.json > dcwn01-list_v3.json
```

The tool automatically handles:
- Property renames
- Structural reorganization
- Annotation format updates
- Context URL updates

### Phase 3: Test Migration

#### 1. Create Test Branch

```bash
git checkout -b iiif-v3-migration
```

#### 2. Download and Convert One Manifest

```bash
# Create test directory
mkdir -p test_migration

# Download David Copperfield manifest
curl https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif/davidcopperfieldtranscription/manifest.json \
  > test_migration/dc_manifest_v2.json

# Convert to v3
prezi-upgrade test_migration/dc_manifest_v2.json \
  > test_migration/dc_manifest_v3.json

# View differences
diff test_migration/dc_manifest_v2.json test_migration/dc_manifest_v3.json
```

#### 3. Convert Annotation Lists

```bash
# Download all annotation lists for one novel
for i in {01..19}; do
  curl "https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/dcwn${i}-list.json" \
    > "test_migration/dcwn${i}-list_v2.json"
done

# Convert each annotation list
for file in test_migration/dcwn*-list_v2.json; do
  basename=$(basename "$file" _v2.json)
  prezi-upgrade "$file" > "test_migration/${basename}_v3.json"
done
```

#### 4. Host Test Files

Upload converted files to a test location:

```bash
# Option A: Use a test branch on GitHub Pages
git checkout -b test-v3-manifests
cp test_migration/*_v3.json public/test-manifests/
git add public/test-manifests/
git commit -m "Add test v3 manifests"
git push origin test-v3-manifests

# Option B: Use a local dev server
cd test_migration
python -m http.server 8000
# Access at http://localhost:8000/
```

#### 5. Test in Mirador

Create a test page:

```astro
---
// src/pages/test-v3-migration.astro
import MiradorFullScreenLayout from "../layouts/mirador-full-screen-layout.astro";
import Mirador from "../components/Mirador";

const manifest = "http://localhost:8000/dc_manifest_v3.json";
// Or use GitHub Pages URL
---

<MiradorFullScreenLayout
  title="IIIF v3 Migration Test"
  description="Testing Presentation API 3.0 migration"
>
  <Mirador client:only="react" loadedManifest={manifest} />
</MiradorFullScreenLayout>
```

Start dev server and test:

```bash
pnpm dev
# Visit http://localhost:4321/test-v3-migration
```

#### 6. Verify Functionality

Test that:
- ✅ All canvases load correctly
- ✅ Images display at correct sizes
- ✅ Annotations appear and are clickable
- ✅ Annotation content displays correctly
- ✅ Search/indexing still works
- ✅ Deep linking to specific annotations works
- ✅ Layer toggles work (important for multi-layer images!)

#### 7. Test Annotation Indexing

Verify your Python indexing script handles v3 format:

```bash
# Modify createindex-parseannotations.py to use test v3 annotations
python createindex-parseannotations.py
```

Check that:
- Annotations are parsed correctly
- Search fields are populated
- Facets (tags, creators) are extracted
- URLs are generated correctly

### Phase 4: Batch Conversion Script

Create a script to convert all manifests:

```bash
#!/bin/bash
# convert_all_to_v3.sh

OUTPUT_DIR="iiif_v3_converted"
mkdir -p "$OUTPUT_DIR"

# Base URL
BASE_URL="https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif"

# Novels to convert
NOVELS=(
  "bleakhousetranscriptions"
  "davidcopperfieldtranscription"
  "HardTimesTranscription"
  "littledorrittranscription"
)

for novel in "${NOVELS[@]}"; do
  echo "Converting $novel..."

  # Create output directory
  mkdir -p "$OUTPUT_DIR/$novel"

  # Convert manifest
  echo "  Converting manifest..."
  curl -s "$BASE_URL/$novel/manifest.json" | \
    prezi-upgrade - > "$OUTPUT_DIR/$novel/manifest.json"

  # Find and convert annotation lists
  echo "  Converting annotation lists..."
  # This assumes you have a list of annotation files
  # Adjust the pattern based on your actual file structure

  # For David Copperfield: dcwn01-list.json to dcwn19-list.json
  if [[ "$novel" == "davidcopperfieldtranscription" ]]; then
    for i in {01..19}; do
      curl -s "$BASE_URL/$novel/dcwn${i}-list.json" 2>/dev/null | \
        prezi-upgrade - > "$OUTPUT_DIR/$novel/dcwn${i}-list.json" 2>/dev/null || true
    done
  fi

  # Add similar patterns for other novels

done

echo "Conversion complete! Files in $OUTPUT_DIR/"
```

Make it executable and run:

```bash
chmod +x convert_all_to_v3.sh
./convert_all_to_v3.sh
```

### Phase 5: Deployment Strategy

#### Option A: Parallel Deployment (Recommended - Safest)

Keep both versions available during transition:

```
dickensnotes.github.io/dickens-annotations/
├── img/derivatives/iiif/
│   ├── davidcopperfieldtranscription/
│   │   ├── manifest.json          # v2 (existing)
│   │   ├── manifest_v3.json       # v3 (new)
│   │   ├── dcwn01-list.json       # v2
│   │   └── dcwn01-list_v3.json    # v3
```

Update pages gradually:

```astro
// Start with test pages
const USE_V3 = true;
const manifest = USE_V3
  ? "...manifest_v3.json"
  : "...manifest.json";
```

Benefits:
- Easy rollback
- Can compare versions
- Low risk

#### Option B: Full Migration (If Confident)

Replace all v2 files with v3:

```bash
# Backup v2 files
cp -r img/derivatives/iiif img/derivatives/iiif_v2_backup

# Replace with v3
cp -r iiif_v3_converted/* img/derivatives/iiif/
```

Benefits:
- Clean structure
- Single source of truth
- Simpler URLs

Risks:
- No easy rollback
- Must be confident in conversion

### Phase 6: Update Code References

Search for hardcoded references:

```bash
# Find v2 context references
grep -r "presentation/2" src/

# Find @id references (should use 'id' in v3)
grep -r "@id" src/

# Check for @type
grep -r "@type" src/
```

Update JavaScript/TypeScript code to use v3 properties.

---

## Testing Multi-Layer Support

When adding manuscript images as layers, test with v3:

### Create Multi-Layer Test Manifest

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://dickensnotes.../manifest.json",
  "type": "Manifest",
  "label": { "en": ["David Copperfield Working Notes"] },
  "items": [
    {
      "id": "https://dickensnotes.../canvas/dcwn01",
      "type": "Canvas",
      "height": 2100,
      "width": 2700,
      "items": [
        {
          "id": "https://dickensnotes.../page/dcwn01/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://dickensnotes.../annotation/dcwn01-manuscript",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://dickensnotes.../manuscript/dcwn01.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "height": 2100,
                "width": 2700
              },
              "target": "https://dickensnotes.../canvas/dcwn01"
            },
            {
              "id": "https://dickensnotes.../annotation/dcwn01-transcription",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://dickensnotes.../transcription/dcwn01.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "height": 2100,
                "width": 2700
              },
              "target": "https://dickensnotes.../canvas/dcwn01"
            }
          ]
        }
      ],
      "annotations": [
        {
          "id": "https://dickensnotes.../dcwn01-list.json",
          "type": "AnnotationPage"
        }
      ]
    }
  ]
}
```

**Important**: The second image in `items` appears on top (z-index behavior).

### Test Layer Interaction with Annotations

Verify that:
1. Annotations appear on both layers
2. Toggling layers doesn't break annotations
3. Annotations maintain correct coordinates
4. Mirador's layer panel works correctly

---

## Breaking Changes to Watch For

### 1. Embedded vs. Referenced Annotations

**v2**: Used `otherContent` for external annotation lists

```json
"otherContent": [
  {
    "@id": "dcwn01-list.json",
    "@type": "sc:AnnotationList"
  }
]
```

**v3**: Uses `annotations` property

```json
"annotations": [
  {
    "id": "dcwn01-list.json",
    "type": "AnnotationPage"
  }
]
```

Ensure all annotation list references are updated.

### 2. Service Declarations

Image services may need updates:

```json
// v2
"service": {
  "@context": "http://iiif.io/api/image/2/context.json",
  "@id": "https://dickensnotes.../image/dcwn01",
  "profile": "http://iiif.io/api/image/2/level2.json"
}

// v3
"service": [
  {
    "id": "https://dickensnotes.../image/dcwn01",
    "type": "ImageService3",
    "profile": "level2"
  }
]
```

### 3. Language Maps

All text values should use language maps:

```json
// v2
"label": "David Copperfield Working Notes"

// v3
"label": {
  "en": ["David Copperfield Working Notes"]
}
```

### 4. Rights Statements

```json
// v2
"license": "http://creativecommons.org/licenses/by-nc-sa/4.0/",
"attribution": "© Digital Dickens Notes Project (DDNP) 2022"

// v3
"rights": "http://creativecommons.org/licenses/by-nc-sa/4.0/",
"requiredStatement": {
  "label": { "en": ["Attribution"] },
  "value": { "en": ["© Digital Dickens Notes Project (DDNP) 2022"] }
}
```

### 5. Sequences Removed

```json
// v2
{
  "sequences": [
    {
      "@type": "sc:Sequence",
      "canvases": [...]
    }
  ]
}

// v3
{
  "items": [...]  // Canvases go directly here
}
```

### 6. AnnotationList → AnnotationPage

All annotation list files must be updated:

```json
// v2 annotation list file structure
{
  "@context": "http://iiif.io/api/presentation/2/context.json",
  "@type": "sc:AnnotationList",
  "@id": "https://dickensnotes.../dcwn01-list.json",
  "resources": [...]
}

// v3 annotation page file structure
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "https://dickensnotes.../dcwn01-list.json",
  "type": "AnnotationPage",
  "items": [...]
}
```

---

## Annonatate-Specific Considerations

### If Annonatate Only Exports v2

**Workaround**: Use post-processing in your build/deploy pipeline

```bash
# In your GitHub Actions or deployment script
for manifest in img/derivatives/iiif/*/manifest.json; do
  prezi-upgrade "$manifest" > "${manifest%.json}_v3.json"
  mv "${manifest%.json}_v3.json" "$manifest"
done

for annotationlist in img/derivatives/iiif/*/*-list.json; do
  prezi-upgrade "$annotationlist" > "${annotationlist%.json}_v3.json"
  mv "${annotationlist%.json}_v3.json" "$annotationlist"
done
```

### If Annonatate Supports v3

**Update workflow**:
1. Check Annonatate settings for API version preference
2. Re-export all manifests from Annonatate in v3 format
3. Update your GitHub Pages deployment
4. Verify all annotations preserved correctly

### Contact Annonatate Maintainer

If unsure about v3 support:
- Check [Annonatate GitHub Issues](https://github.com/annonatate/annonatate/issues)
- Open a new issue asking about v3 support
- Contact Niqui O'Neill (see [profile](https://dnoneill.github.io/))

### Annotations Remain Valid

Good news: Your annotations target **canvas coordinates**, not API-specific formats. The spatial coordinates (`xywh=x,y,w,h`) remain valid across versions—only the JSON structure changes.

This means:
- Annotation positions won't change
- Deep links will still work (with URL updates)
- Annotation content is preserved

---

## Recommended Timeline

### Week 1: Assessment & Testing
- [ ] Check Annonatate's current API version output
- [ ] Install and test prezi-2-to-3 tool
- [ ] Convert one manifest + annotation lists
- [ ] Verify converted files in Mirador
- [ ] Test annotation functionality

### Week 2: Conversion Script & Validation
- [ ] Write automation script for all manifests
- [ ] Convert all 4 novels + annotations
- [ ] Validate JSON structure of all converted files
- [ ] Test annotation search/indexing with v3
- [ ] Document any issues found

### Week 3: Staging Deployment & QA
- [ ] Deploy v3 manifests to staging/test environment
- [ ] Update test pages to use v3 manifests
- [ ] Full QA testing:
  - All canvases load
  - Images display correctly
  - Annotations work
  - Deep linking works
  - Search functionality works
- [ ] Test on multiple browsers
- [ ] Test with multi-layer images (if ready)

### Week 4: Production Deployment
- [ ] Backup current v2 files
- [ ] Deploy v3 to production
- [ ] Update all page references
- [ ] Monitor for issues (analytics, error logs)
- [ ] Keep v2 backups for 30 days

---

## Migration Checklist

### Pre-Migration

- [ ] Identify which API version Annonatate currently uses
- [ ] Document current manifest structure
- [ ] Create backup of all current IIIF resources
- [ ] Install prezi-2-to-3 conversion tool
- [ ] Set up test environment

### Conversion

- [ ] Test prezi-2-to-3 on one manifest
- [ ] Test prezi-2-to-3 on one annotation list
- [ ] Verify converted manifest in Mirador
- [ ] Create batch conversion script
- [ ] Convert all manifests programmatically
- [ ] Convert all annotation lists
- [ ] Validate all converted JSON files

### Code Updates

- [ ] Update annotation parsing script for v3
- [ ] Test annotation search/indexing
- [ ] Update any hardcoded v2 context references
- [ ] Update property references (@id → id, @type → type)
- [ ] Update image service declarations if needed

### Testing

- [ ] Test in Mirador 4.0 (your current version)
- [ ] Verify all canvases load correctly
- [ ] Test annotation display and interaction
- [ ] Test deep linking to annotations
- [ ] Test layer visibility toggles
- [ ] Test multi-layer functionality
- [ ] Test annotation search
- [ ] Cross-browser testing
- [ ] Mobile device testing

### Deployment

- [ ] Deploy to staging environment
- [ ] Full QA testing in staging
- [ ] Update documentation
- [ ] Plan rollback procedure
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Verify analytics tracking
- [ ] Keep v2 backups accessible

### Post-Migration

- [ ] Monitor for issues (first 48 hours critical)
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Update this guide with findings
- [ ] Archive v2 backups after 30 days

---

## Resources

### Official IIIF Documentation

- [IIIF Presentation API 3.0 Specification](https://iiif.io/api/presentation/3.0/)
- [Presentation API 3.0 Change Log](https://iiif.io/api/presentation/3.0/change-log/)
- [IIIF Cookbook Recipes](https://iiif.io/api/cookbook/)
- [Recipe 0036: Composition from Multiple Images](https://iiif.io/api/cookbook/recipe/0036-composition-from-multiple-images/)
- [Recipe 0326: Annotating Specific Images or Layers](https://iiif.io/api/cookbook/recipe/0326-annotating-image-layer/)

### Migration Tools

- [prezi-2-to-3 Migration Tool (Official)](https://github.com/IIIF/prezi-2-to-3)
- [Bodleian IIIF Manifest Editor](https://github.com/bodleian/iiif-manifest-editor)
- [IIIF Presentation API Validator](https://presentation-validator.iiif.io/)

### Annonatate Resources

- [Annonatate Website](https://annonatate.fly.dev/)
- [Annonatate Documentation](https://annonatate.github.io/)
- [Annonatate GitHub Repository](https://github.com/annonatate/annonatate)
- [Annonatate IIIF Workshop Tutorial](https://training.iiif.io/dhsi/day-three/annonatate.html)
- [Niqui O'Neill's Profile](https://dnoneill.github.io/)

### Mirador Resources

- [Mirador Website](https://projectmirador.org/)
- [Mirador GitHub Repository](https://github.com/ProjectMirador/mirador)
- [Mirador IIIF Ecosystem Guide](https://www.mirador-multi-user.com/iiif-and-mirador-ecosystem/)
- [Mirador Configuration Documentation](https://github.com/ProjectMirador/mirador/wiki)

### IIIF Community

- [IIIF Community Slack](https://iiif.io/community/#join-us)
- [IIIF Technical Specification Discussions](https://github.com/IIIF/api/discussions)
- [IIIF Awesome List](https://github.com/IIIF/awesome-iiif)

### Educational Resources

- [IIIF Online Workshop](https://training.iiif.io/iiif-online-workshop/)
- [IIIF 5-Day Workshop](https://training.iiif.io/iiif-5-day-workshop/)
- [IIIF Workshop by Jason Ronallo](https://ronallo.com/iiif-workshop/)

---

## Quick Reference: v2 vs v3 Mapping

| v2 Property | v3 Property | Notes |
|-------------|-------------|-------|
| `@context` | `@context` | URL changes to /3/context.json |
| `@id` | `id` | All resources |
| `@type` | `type` | All resources |
| `label` | `label` | Now requires language map |
| `description` | `summary` | Short descriptive text |
| `attribution` | `requiredStatement` | Now label+value structure |
| `license` | `rights` | Same concept, renamed |
| `viewingHint` | `behavior` | Semantic improvement |
| `sequences` | (removed) | Use `items` directly |
| `canvases` | `items` | On Manifest level |
| `resources` | `items` | On AnnotationPage |
| `otherContent` | `annotations` | References AnnotationPages |
| `resource` | `body` | On Annotation |
| `on` | `target` | On Annotation |
| `chars` | `value` | On TextualBody |
| `sc:AnnotationList` | `AnnotationPage` | Type change |
| `oa:Annotation` | `Annotation` | Namespace removed |
| `cnt:ContentAsText` | `TextualBody` | Type change |
| `sc:painting` | `painting` | Namespace removed |
| `contentLayer` | `supplementary` | Property rename |

---

## Version

- **Document Version**: 1.0
- **Last Updated**: 2026-01-22
- **DDNP IIIF Version**: 2.0 → 3.0
- **Mirador Version**: 4.0.0

---

## Notes and Observations

Use this section to document findings during your migration:

### Test Results

```
Date: ___________
Tester: ___________

Manifest: ___________
Status: [ ] Pass [ ] Fail
Issues: ___________

Annotations: ___________
Status: [ ] Pass [ ] Fail
Issues: ___________
```

### Issues Encountered

```
1. Issue: ___________
   Solution: ___________
   Date: ___________

2. Issue: ___________
   Solution: ___________
   Date: ___________
```

### Performance Notes

```
v2 Load Time: ___________
v3 Load Time: ___________
Annotation Count: ___________
Canvas Count: ___________
```

---

## Contact

For questions about this migration:
- **DDNP Project**: [Repository Issues](https://github.com/dickensnotes/ddnp/issues)
- **IIIF Community**: [IIIF Slack](https://iiif.io/community/#join-us)
- **Annonatate Support**: [GitHub Issues](https://github.com/annonatate/annonatate/issues)
