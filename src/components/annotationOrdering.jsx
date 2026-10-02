import React, { createContext, forwardRef, useCallback, useContext, useMemo, useState } from "react";
import { Button, SvgIcon } from "@mui/material";
import { canvasAnnotationsPlugin } from "mirador-annotation-editor";

/**
 * "Move up" / "Move down" buttons on each annotation in the editor's list.
 *
 * Mirador hands every wrap plugin the original component, so a second
 * plugin can't wrap MAE's list. Instead this replaces MAE's
 * canvasAnnotationsPlugin with a copy that gives MAE's wrapper a
 * TargetComponent adding the buttons to MAE's list items.
 */

const PluginContext = createContext(null); // MAE plugin props: TargetComponent, config, receiveAnnotation
const OrderContext = createContext(null); // one canvas's list: ids, move, busy, canWrite

const ARROW_UP = "M7 14l5-5 5 5z";
const ARROW_DOWN = "M7 10l5 5 5-5z";

function OrderButton({ label, shortLabel, path, disabled, onMove }) {
  return (
    <Button
      size="small"
      variant="outlined"
      aria-label={label}
      disabled={disabled}
      startIcon={<SvgIcon><path d={path} /></SvgIcon>}
      onClick={(event) => {
        event.stopPropagation(); // don't select the annotation
        onMove();
      }}
      onKeyDown={(event) => event.stopPropagation()} // keep the list's arrow-key navigation out
      sx={{ textTransform: "none", py: 0, whiteSpace: "nowrap", minWidth: 0 }}
    >
      {shortLabel}
    </Button>
  );
}

function OrderButtons({ annotationId }) {
  const order = useContext(OrderContext);
  if (!order) return null;
  const { ids, move, busy, canWrite } = order;
  const index = ids.indexOf(annotationId);
  if (index < 0) return null;

  return (
    <span
      role="group"
      aria-label="Reading order"
      title={canWrite ? undefined : "Sign in to change the order"}
      style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}
    >
      <OrderButton
        label="Move up"
        shortLabel="Up"
        path={ARROW_UP}
        disabled={!canWrite || busy || index === 0}
        onMove={() => move(annotationId, -1)}
      />
      <OrderButton
        label="Move down"
        shortLabel="Down"
        path={ARROW_DOWN}
        disabled={!canWrite || busy || index === ids.length - 1}
        onMove={() => move(annotationId, 1)}
      />
    </span>
  );
}

const listItemCache = new WeakMap();

/**
 * MAE's list item, plus the order buttons on a row below its content.
 * (Mirador's list items lay out in a row, so the content and buttons are
 * stacked in a column inside it.)
 */
function withOrderButtons(ListItem) {
  if (!listItemCache.has(ListItem)) {
    const OrderedListItem = forwardRef((props, ref) => (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <ListItem {...props} ref={ref}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {props.children}
          <OrderButtons annotationId={props.annotationid} />
        </div>
      </ListItem>
    ));
    OrderedListItem.displayName = "OrderedListItem";
    listItemCache.set(ListItem, OrderedListItem);
  }
  return listItemCache.get(ListItem);
}

/** Mirador's CanvasAnnotations (one canvas's list), with ordering added. */
const OrderedCanvasAnnotations = forwardRef((targetProps, ref) => {
  const { TargetComponent, config, receiveAnnotation } = useContext(PluginContext);
  const { annotations = [], canvasId, listContainerComponent, selectAnnotation, windowId } = targetProps;
  const [busy, setBusy] = useState(false);

  const adapter = useMemo(() => config.annotation.adapter(canvasId), [config, canvasId]);

  const move = useCallback(async (annotationId, direction) => {
    setBusy(true);
    try {
      const page = await adapter.move(annotationId, direction);
      receiveAnnotation(canvasId, adapter.annotationPageId, page);
      selectAnnotation?.(windowId, annotationId); // keep attention on the moved annotation
    } finally {
      setBusy(false);
    }
  }, [adapter, canvasId, receiveAnnotation, selectAnnotation, windowId]);

  const order = useMemo(() => ({
    ids: annotations.map((annotation) => annotation.id),
    move,
    busy,
    canWrite: Boolean(adapter.canWrite) && config.annotation.readonly !== true,
  }), [annotations, move, busy, adapter, config]);

  return (
    <OrderContext.Provider value={order}>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <TargetComponent
        {...targetProps}
        ref={ref}
        listContainerComponent={withOrderButtons(listContainerComponent ?? "li")}
      />
    </OrderContext.Provider>
  );
});
OrderedCanvasAnnotations.displayName = "OrderedCanvasAnnotations";

/** Replacement for MAE's wrapper component: same props, our TargetComponent. */
function OrderingCanvasAnnotationsWrapper(props) {
  const MaeWrapper = canvasAnnotationsPlugin.component;
  const { TargetComponent, config, receiveAnnotation } = props;
  const plugin = useMemo(
    () => ({ TargetComponent, config, receiveAnnotation }),
    [TargetComponent, config, receiveAnnotation],
  );
  return (
    <PluginContext.Provider value={plugin}>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <MaeWrapper {...props} TargetComponent={OrderedCanvasAnnotations} />
    </PluginContext.Provider>
  );
}

const orderingCanvasAnnotationsPlugin = {
  ...canvasAnnotationsPlugin,
  component: OrderingCanvasAnnotationsWrapper,
};

/** MAE's plugins with the list plugin swapped for the ordering version. */
export function withAnnotationOrdering(plugins) {
  if (!plugins.includes(canvasAnnotationsPlugin)) {
    throw new Error("MAE's canvasAnnotationsPlugin not found; annotation ordering can't be added.");
  }
  return plugins.map((plugin) => (plugin === canvasAnnotationsPlugin ? orderingCanvasAnnotationsPlugin : plugin));
}
