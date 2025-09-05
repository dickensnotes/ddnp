import React, { useEffect } from "react";
import mirador from "mirador";

export default function Mirador(props) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const canvas = urlParams.get("canvas");
  const annotationid = urlParams.get('annotationid');
  const config = {
    id: "mirador",
    annotations: {
      displayAll: true,
      displayAllDisabled: false,
    },
    window: {
      defaultSideBarPanel: "annotations",
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
    if (annotationid){
      setTimeout(() => {
        document.querySelector(`[annotationid="${annotationid}"]`).click();
      }, "2000");
    }
  });

  return <div id="mirador" />;
}
