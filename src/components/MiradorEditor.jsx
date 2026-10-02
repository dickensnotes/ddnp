import React, { useEffect } from "react";
import mirador from "mirador";
import annotationPlugins from "mirador-annotation-editor";
import "mirador-annotation-editor/dist/index.css";
import GitHubAnnotationAdapter from "../lib/GitHubAnnotationAdapter.js";
import { withAnnotationOrdering } from "./annotationOrdering";

// Test: Mirador + Mirador Annotation Editor (MAE), reading and saving
// annotations on the mae-poc branch of dickens-annotations. Without a token
// it is read-only.

// All annotations reach the editor through the adapter, so drop the
// manifest's links to the published lists; otherwise Mirador loads them too
// and every annotation appears twice.
function withoutAnnotationLists(url, action) {
  if (!action.manifestJson?.sequences) return action;
  const manifestJson = structuredClone(action.manifestJson);
  manifestJson.sequences.forEach((sequence) =>
    sequence.canvases.forEach((canvas) => delete canvas.otherContent)
  );
  return { ...action, manifestJson };
}

export default function MiradorEditor(props) {
  const urlParams = new URLSearchParams(window.location.search);
  const canvas = urlParams.get("canvas");

  const config = {
    id: "mirador",
    annotation: {
      adapter: (canvasId) =>
        new GitHubAnnotationAdapter(canvasId, {
          manifestId: props.loadedManifest,
          token: props.token,
          user: props.user,
        }),
      allowTargetShapesStyling: true,
      readonly: false,
    },
    requests: {
      postprocessors: [withoutAnnotationLists],
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
    mirador.viewer(config, withAnnotationOrdering([...annotationPlugins]));
  }, []);

  return <div id="mirador" />;
}
