import React, {
  createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { Button, SvgIcon } from "@mui/material";
import { canvasAnnotationsPlugin } from "mirador-annotation-editor";

/**
 * "Move up" / "Move down" buttons on each annotation in the editor's list.
 *
 * Mirador hands every wrap plugin the original component, so a second
 * plugin can't wrap MAE's list. Instead this replaces MAE's
 * canvasAnnotationsPlugin with a copy that gives MAE's wrapper a
 * TargetComponent adding the buttons to MAE's list items.
 *
 * This relies on MAE and Mirador internals; tests/mae-integration.test.js
 * checks them, so an upgrade that breaks them fails the tests.
 */

const PluginContext = createContext(null); // MAE plugin props: TargetComponent, config, receiveAnnotation
const OrderContext = createContext(null); // one canvas's list: ids, move, busy, canWrite, focus request

const ARROW_UP = "M7 14l5-5 5 5z";
const ARROW_DOWN = "M7 10l5 5 5-5z";

// aria-disabled rather than disabled: browsers drop keyboard focus from a
// button the moment it becomes disabled, e.g. while a move is saving.
const OrderButton = forwardRef(({ label, shortLabel, path, inactive, onMove }, ref) => (
  <Button
    ref={ref}
    size="small"
    variant="outlined"
    aria-label={label}
    aria-disabled={inactive || undefined}
    disableRipple={inactive}
    startIcon={<SvgIcon><path d={path} /></SvgIcon>}
    onClick={(event) => {
      event.stopPropagation(); // don't select the annotation
      if (!inactive) onMove();
    }}
    onKeyDown={(event) => event.stopPropagation()} // keep the list's arrow-key navigation out
    sx={{
      flex: 1, // share the row's full width
      minWidth: 0,
      minHeight: 0,
      py: "1px",
      lineHeight: 1.4,
      fontSize: "0.8rem",
      textTransform: "none",
      whiteSpace: "nowrap",
      "& .MuiButton-startIcon": { mr: 0.25 },
      "& .MuiSvgIcon-root": { fontSize: 18 },
      ...(inactive && { opacity: 0.4, cursor: "default" }),
    }}
  >
    {shortLabel}
  </Button>
));
OrderButton.displayName = "OrderButton";

function OrderButtons({ annotationId }) {
  const order = useContext(OrderContext);
  const upRef = useRef(null);
  const downRef = useRef(null);
  const index = order ? order.ids.indexOf(annotationId) : -1;
  const isFirst = index === 0;
  const isLast = order ? index === order.ids.length - 1 : false;
  const focusRequest = order?.focusRequest;

  // Re-sorting moves this item within the page, which drops focus. Put it
  // back on the button just used, or the other one if this end is reached.
  useEffect(() => {
    if (focusRequest?.annotationId !== annotationId) return;
    const up = focusRequest.direction === -1;
    const button = up ? (isFirst ? downRef : upRef) : (isLast ? upRef : downRef);
    button.current?.focus();
    order.clearFocusRequest();
  }, [focusRequest, annotationId, isFirst, isLast, order]);

  if (!order || index < 0) return null;
  const { move, busy, canWrite } = order;

  return (
    <span
      role="group"
      aria-label="Reading order"
      title={canWrite ? undefined : "Sign in to change the order"}
      style={{ display: "flex", gap: 8, width: "100%", marginTop: 6 }}
    >
      <OrderButton
        ref={upRef}
        label="Move up"
        shortLabel="Up"
        path={ARROW_UP}
        inactive={!canWrite || busy || isFirst}
        onMove={() => move(annotationId, -1)}
      />
      <OrderButton
        ref={downRef}
        label="Move down"
        shortLabel="Down"
        path={ARROW_DOWN}
        inactive={!canWrite || busy || isLast}
        onMove={() => move(annotationId, 1)}
      />
    </span>
  );
}

// One wrapped component per MAE list item component: a new component on
// every render would make React remount every list item each time.
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
  const [focusRequest, setFocusRequest] = useState(null);
  const clearFocusRequest = useCallback(() => setFocusRequest(null), []);

  const adapter = useMemo(() => config.annotation.adapter(canvasId), [config, canvasId]);

  const move = useCallback(async (annotationId, direction) => {
    setBusy(true);
    try {
      const page = await adapter.move(annotationId, direction);
      receiveAnnotation(canvasId, adapter.annotationPageId, page);
      selectAnnotation?.(windowId, annotationId); // keep attention on the moved annotation
      setFocusRequest({ annotationId, direction });
    } finally {
      setBusy(false);
    }
  }, [adapter, canvasId, receiveAnnotation, selectAnnotation, windowId]);

  const order = useMemo(() => ({
    ids: annotations.map((annotation) => annotation.id),
    move,
    busy,
    canWrite: Boolean(adapter.canWrite) && config.annotation.readonly !== true,
    focusRequest,
    clearFocusRequest,
  }), [annotations, move, busy, adapter, config, focusRequest, clearFocusRequest]);

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
