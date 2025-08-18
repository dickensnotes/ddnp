import React, { useEffect } from "react";
import mirador from "mirador";

export default function Mirador(props) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const canvas = urlParams.get("canvas");
  const annotationid = urlParams.get('annotationid');
  const config = {
    id: "mirador",
    // Note: Annotations functionality temporarily disabled due to mirador-annotations v0.5.0 
    // incompatibility with Mirador v4. Will need to find alternative or wait for compatible version.
    window: {
      defaultSideBarPanel: "info",
      sideBarOpenByDefault: true,
    },
    thumbnailNavigation: {
      defaultPosition: "far-right",
    },
    catalog: [
      // {
      //   manifestId:
      //     "https://sad-leakey-4368a8.netlify.app/img/derivatives/iiif/dc/manifest.json",
      // },
    ],
    windows: [
      {
        loadedManifest: `${props.loadedManifest}`,
        canvasId: canvas,
      },
    ],
  };

  const plugins = [];

  useEffect(() => {
    mirador.viewer(config, plugins);
    // Note: Annotation ID functionality disabled - requires mirador-annotations
    // if (annotationid){
    //   setTimeout(() => {
    //     document.querySelector(`[annotationid="${annotationid}"]`).click();
    //   }, "2000");
    // }
  });

  return <div id="mirador" />;
}
