import React, { useEffect } from "react";
import mirador from "mirador";
import annotationPlugins, { annotationAdapters } from "mirador-annotation-editor";
import "mirador-annotation-editor/dist/index.css";

// Test: Mirador + Mirador Annotation Editor (MAE) with MAE's bundled
// LocalStorageAdapter. Annotations are saved in this browser only.
export default function MiradorEditor(props) {
  const urlParams = new URLSearchParams(window.location.search);
  const canvas = urlParams.get("canvas");

  const config = {
    id: "mirador",
    annotation: {
      adapter: (canvasId) =>
        new annotationAdapters.LocalStorageAdapter(
          `localStorage://?canvasId=${canvasId}`,
          "Test user"
        ),
      allowTargetShapesStyling: true,
      exportLocalStorageAnnotations: true,
      readonly: false,
    },
    annotations: {
      displayAll: true,
      displayAllDisabled: false,
      htmlSanitizationRuleSet: "mirador2",
    },
    // MAE's forms use these custom MUI typography variants
    themes: {
      light: {
        typography: {
          formSectionTitle: {
            fontSize: "1.215rem",
          },
          subFormSectionTitle: {
            fontSize: "0.937rem",
            fontWeight: 300,
          },
        },
      },
    },
    window: {
      defaultSideBarPanel: "annotations",
      sideBarOpenByDefault: true,
    },
    thumbnailNavigation: {
      defaultPosition: "far-right",
    },
    windows: [
      {
        loadedManifest: `${props.loadedManifest}`,
        canvasId: canvas,
      },
    ],
  };

  useEffect(() => {
    mirador.viewer(config, [...annotationPlugins]);
  }, []);

  return <div id="mirador" />;
}
