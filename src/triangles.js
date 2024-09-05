import * as React from "react";

import { produce, current } from "immer";

// this converts local pixel values to inches
const SCALING = 72;

function shuffle(arr) {
  var i = arr.length,
    j,
    temp;
  while (--i > 0) {
    j = Math.floor(Math.random() * (i + 1));
    temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
}

const range = (els) => Array.from(Array(els), (_el, idx) => idx);

const mosaicReducer = (state, action) => {
  switch (action.type) {
    case "ingest_state":
      return action.payload;
    case "set_current_color":
      return produce(state, (draft) => {
        draft.selectedColor = action.payload.color;
      });
    case "set_tile_color": {
      const {
        position: { x, y },
        color,
        index,
      } = action.payload;
      return produce(state, (draft) => {
        if (draft.mosaic[y]?.[x] != null) {
          draft.mosaic[y][x].colors[index] = color;
        } else {
          if (draft.mosaic[y] == null) {
            draft.mosaic[y] = [];
            draft.mosaic[y][x] = { colors: [], orientation: "nw" };
            draft.mosaic[y][x].colors[index] = color;
          } else {
            draft.mosaic[y][x] = { colors: [], orientation: "nw" };
            draft.mosaic[y][x].colors[index] = color;
          }
        }
      });
    }
    case "update_mosaic":
      return produce(state, (draft) => {
        const nextMosaic = action.payload.updater(draft.mosaic);
        draft.mosaic = nextMosaic;
      });
    case "set_mosaic_width":
      return produce(state, (draft) => {
        draft.widthIn = action.payload;
      });
    case "set_mosaic_height":
      return produce(state, (draft) => {
        draft.heightIn = action.payload;
      });
    case "update_module": {
      const { position, data } = action.payload;
      return produce(state, (draft) => {
        draft.mosaic[position.y][position.x] = {
          ...draft.mosaic[position.y][position.x],
          ...data,
        };
      });
    }
    case "set_module_orientation": {
      const {
        position: { x, y },
        orientation,
      } = action.payload;
      return produce(state, (draft) => {
        draft.mosaic[y][x].orientation = orientation;
      });
    }
    case "toggle_module_orientation": {
      const {
        position: { x, y },
      } = action.payload;
      return produce(state, (draft) => {
        const prev = draft.mosaic[y][x];
        draft.mosaic[y][x].orientation =
          prev.orientation === "nw" ? "sw" : "nw";
      });
    }
    case "flip_module_order": {
      const {
        position: { x, y },
      } = action.payload;
      return produce(state, (draft) => {
        draft.mosaic[y][x].colors.reverse();
      });
    }
    case "update_tile_color": {
      const { position, color, index } = action.payload;
      return produce(state, (draft) => {
        state.mosaic[position.y][position.x].colors[index] = color;
      });
    }
    case "set_tile_size": {
      return produce(state, (draft) => {
        draft.tileWidthIn = Number(action.payload);
        draft.yOffset = selectYOffset(current(draft));
        draft.xOffset = selectXOffset(current(draft));
      });
    }
    case "set_spacing": {
      return produce(state, (draft) => {
        draft.spacingIn = Number(action.payload) / 16;
        draft.yOffset = selectYOffset(current(draft));
        draft.xOffset = selectXOffset(current(draft));
      });
    }
    case "set_keypress": {
      return produce(state, (draft) => {
        draft.currentKey = action.payload;
      });
    }
    case "toggle_anchor": {
      return produce(state, (draft) => {
        if (action.payload === "x") {
          draft.anchorX = draft.anchorX === "left" ? "right" : "left";
        } else {
          draft.anchorY = draft.anchorY === "top" ? "bottom" : "top";
        }
        draft.yOffset = selectYOffset(current(draft));
        draft.xOffset = selectXOffset(current(draft));
      });
    }
  }
  return state;
};

const initMosaicFromState = (statelike) => {
  // ok, so we use 16ths of an inch as the 'base size for everything'
  // so all the In related sizes are assumed to be inches and all get
  // multiplied by 16. 16 is chosen because tile grout is usually 3/8
  // or 3/16th of an inch

  const { widthIn, heightIn, tileWidthIn, anchorY, anchorX, spacingIn } =
    statelike;

  const moduleWidth = tileWidthIn;
  const spacing = spacingIn;

  const actualModuleWidth = moduleWidth + 2 * spacing;
  const actualModuleHeight = moduleWidth + spacing;
  const horizontalModules = Math.ceil(widthIn / actualModuleWidth);
  const verticalModules = Math.ceil(heightIn / actualModuleHeight);

  const yOffset =
    anchorY === "bottom"
      ? // we add the extra spacing here so that the bottom of the module is flush
        // with the bottom of the svg
        (heightIn - verticalModules * actualModuleHeight) * SCALING
      : 0;

  const xOffset =
    anchorX === "right"
      ? // same idea as above
        (widthIn - horizontalModules * actualModuleWidth) * SCALING
      : 0;

  const mosaic = range(verticalModules).map(() =>
    range(horizontalModules).map(() => ({ colors: ["tusk", "tusk"] }))
  );
  return { ...statelike, mosaic, yOffset, xOffset };
};

const selectLogicalModuleWidth = (state) => {
  return state.tileWidthIn + 2 * state.spacingIn;
};
/**
 * return the display module width in svg dimensions
 */
const selectActualModuleWidth = (state) => {
  // this is because for a double triangle module we have the interior grout and the exterior grout
  const actualModuleWidth = selectLogicalModuleWidth(state) * SCALING;
  return actualModuleWidth;
};

const selectLogicalModuleHeight = (state) => {
  return state.tileWidthIn + state.spacingIn;
};
/**
 * return the display module height in svg dimensions
 */
const selectActualModuleHeight = (state) => {
  const actualModuleHeight = selectLogicalModuleHeight(state) * SCALING;
  return actualModuleHeight;
};

/**
 * see how many modules fit vertically in an area
 */
const selectVerticalModulesForArea = (state) => {
  // subtract spacing at the end to ignore the last amount of grout at the bottom
  return Math.ceil(
    state.heightIn / selectLogicalModuleHeight(state) - state.spacingIn
  );
};

const selectHorizontalModulesForArea = (state) => {
  return Math.ceil(
    state.widthIn / selectLogicalModuleWidth(state) - state.spacingIn
  );
};

const selectYOffset = (state) => {
  const verticalModules = selectVerticalModulesForArea(state);
  const overflowAmount =
    state.heightIn - verticalModules * (state.spacingIn + state.tileWidthIn);

  return state.anchorY === "bottom"
    ? (overflowAmount + state.spacingIn) * SCALING
    : 0;
};
const selectXOffset = (state) => {
  const horizontalModules = selectHorizontalModulesForArea(state);
  const overflowAmount =
    state.widthIn -
    horizontalModules * (state.spacingIn * 2 + state.tileWidthIn);
  return state.anchorX === "right"
    ? (overflowAmount + state.spacingIn) * SCALING
    : 0;
};

const tallyTiles = (state, defaultColor = "tusk") => {
  const maskedRegions = [
    [
      [0 + state.xOffset, 0 + state.yOffset],
      [58 * SCALING, 8.3 * SCALING],
    ],
    [
      [88 * SCALING, 0 + state.yOffset],
      [108.5 * SCALING, 8.3 * SCALING],
    ],
  ];

  const visibleRegions = [
    [
      [0, 8.3 * SCALING],
      [state.widthIn * SCALING, state.heightIn * SCALING],
    ],
    [
      [58 * SCALING, 0],
      [88 * SCALING, 8.3 * SCALING],
    ],
  ];

  const actualModuleWidth = selectActualModuleWidth(state);
  const actualModuleHeight = selectActualModuleHeight(state);

  const height = state.heightIn * SCALING;
  const width = state.widthIn * SCALING;

  const actualRows = Math.ceil(height / actualModuleHeight);
  const actualCols = Math.ceil(width / actualModuleWidth);

  const acc = {};
  for (let y = 0; y < actualRows; y += 1) {
    for (let x = 0; x < actualCols; x += 1) {
      const isMaskedModule = !visibleRegions.some((region) => {
        const moduleDims = selectDimensionsForModule(state, x, y);
        return rectsOverlap(moduleDims, region);
      });
      if (isMaskedModule) {
        // console.log(x, y, "masked");
        // console.log(selectDimensionsForModule(state, x, y));
        continue;
      }
      const moduleAtPoint = state.mosaic[y]?.[x];
      if (moduleAtPoint != null) {
        moduleAtPoint.colors.forEach((color) => {
          acc[color] = (acc[color] ?? 0) + 1;
        });
      } else {
        // use default color
        acc[defaultColor] = (acc[defaultColor] ?? 0) + 2;
      }
    }
  }
  return acc;
};

const selectSpacing = (state) => SCALING * state.spacingIn;

export const TriangleApp = () => {
  const initialState = {
    selectedColor: "ember",
    widthIn: 9 * 12 + 0.5,
    heightIn: 2 * 12 + 4.5,
    tileWidthIn: 4,
    spacingIn: 1 / 8,
    anchorY: "bottom",
    anchorX: "right",
    yOffset: 0,
    xOffset: 0,
    mosaic: [[]],
    colors: {
      tusk: "#d1d1d1",
      ember: "#e06f67",
      "tuolomne meadows": "#dfba5a",
      tidewater: "#688b83",
      "tiki blue": "#5494b2",
      "sea green": "#6e876d",
    },
    currentKey: null,
  };
  const [state, dispatch] = React.useReducer(
    mosaicReducer,
    initialState,
    initMosaicFromState
  );

  const mosaicRef = React.useRef(null);

  const handleKeyPress = (evt) => {
    dispatch({ type: "set_keypress", payload: evt.key });
  };
  const clearKeyPress = (evt) =>
    dispatch({ type: "set_keypress", payload: null });

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("keyup", clearKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("keyup", clearKeyPress);
    };
  }, []);

  const [isDragging] = useDropHandler(async (file) => {
    if (file.type !== "application/json") {
      return;
    }
    let content;
    try {
      const text = await file.text();
      content = JSON.parse(text);
    } catch (err) {
      console.error("not valid json");
      return;
    }
    dispatch({ type: "ingest_state", payload: content });
  });

  return (
    <MosaicContext.Provider value={{ state, dispatch }}>
      <div>
        <Mosaic
          ref={mosaicRef}
          height={state.heightIn * SCALING}
          width={state.widthIn * SCALING}
          moduleWidth={state.tileWidthIn * SCALING}
          spacing={state.spacingIn * SCALING}
        />
      </div>
      <ColorWells
        colors={state.colors}
        selectedColor={state.selectedColor}
        onChange={(color) => {
          dispatch({ type: "set_current_color", payload: { color } });
        }}
      />
      <DownloadButton
        filename="mosaic.svg"
        getBlob={() => {
          return new Blob(
            [
              `<?xml version="1.0" standalone="no"?>
          ${mosaicRef.current.outerHTML}`.replace(
                "<svg",
                '<svg xmlns="http://www.w3.org/2000/svg"'
              ),
            ],
            { type: "image/svg+xml;charset=utf-8" }
          );
        }}
      >
        download mosaic as svg
      </DownloadButton>
      <div style={{ display: "flex" }}>
        <div>
          <label>
            Tile Size: {state.tileWidthIn}"<br />
            3"
            <input
              type="range"
              min="3"
              max="4"
              value={`${state.tileWidthIn}`}
              onChange={(evt) => {
                dispatch({
                  type: "set_tile_size",
                  payload: evt.currentTarget.value,
                });
              }}
            />
            4"
          </label>
          <div>
            <label>
              width (inches)
              <input
                type="number"
                min="0"
                value={`${state.widthIn}`}
                onChange={(evt) => {
                  dispatch({
                    type: "set_mosaic_width",
                    payload: evt.currentTarget.value,
                  });
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginLeft: 20 }}>
          <label>
            Grout Spacing Size:{" "}
            {Math.round(state.spacingIn * 16) % 2 === 0
              ? state.spacingIn * 8
              : state.spacingIn * 16}
            /{(state.spacingIn * 16) % 2 === 0 ? "8" : "16"}" <br /> 1/16"
            <input
              type="range"
              // goes from 1/16 -> 3/8
              min="1"
              max="6"
              value={state.spacingIn * 16}
              onChange={(evt) => {
                dispatch({
                  type: "set_spacing",
                  payload: evt.currentTarget.value,
                });
              }}
            />
            3/8"
          </label>
          <div>
            <label>
              height (inches)
              <input
                type="number"
                min="0"
                value={`${state.heightIn}`}
                onChange={(evt) => {
                  dispatch({
                    type: "set_mosaic_height",
                    payload: evt.currentTarget.value,
                  });
                }}
              />
            </label>
          </div>
        </div>
        <div style={{ marginLeft: 20 }}>
          <label>
            anchored {state.anchorX}
            <input
              type="checkbox"
              checked={state.anchorX === "left"}
              onChange={(evt) =>
                dispatch({ type: "toggle_anchor", payload: "x" })
              }
            />
          </label>
          <label>
            anchored {state.anchorY}
            <input
              type="checkbox"
              checked={state.anchorY === "bottom"}
              onChange={(evt) =>
                dispatch({ type: "toggle_anchor", payload: "y" })
              }
            />
          </label>
        </div>
        <div style={{ marginLeft: 20 }}>
          <pre>{JSON.stringify(tallyTiles(state), undefined, 2)}</pre>
        </div>
      </div>

      <p>click or drag while holding shift, to flip the colors in a module</p>
      <p>
        click or drag while holding alt to rotate a module's orientation 90
        degrees
      </p>
      <DownloadButton
        filename="mosaicstate.json"
        getBlob={() => {
          return new Blob([JSON.stringify(state)], {
            type: "application/json",
          });
        }}
      >
        export state
      </DownloadButton>
    </MosaicContext.Provider>
  );
};

function DownloadButton({ getBlob, filename, children }) {
  const linkRef = React.createRef();
  const [linkUrl, setLinkUrl] = React.useState();

  React.useEffect(() => {
    if (linkUrl !== "") {
      linkRef.current?.click();
    }
  }, [linkUrl]);

  return (
    <>
      <button
        onClick={(evt) => {
          const blob = getBlob();
          setLinkUrl(URL.createObjectURL(blob));
          // linkRef.current?.click()
        }}
      >
        {children ?? "download"}
      </button>
      <a
        ref={linkRef}
        style={{ display: "none" }}
        href={linkUrl}
        download={filename}
      >
        hidden link
      </a>
    </>
  );
}

const MosaicContext = React.createContext();

function ColorWells({ colors, selectedColor, onChange }) {
  const colorEntries = Object.entries(colors);
  const listenForColorChanges = (evt) => {
    if (
      range(colorEntries.length)
        .map((idx) => `${idx + 1}`)
        .includes(evt.key)
    ) {
      onChange(colorEntries[Number(evt.key) - 1][0]);
    }
  };
  React.useEffect(() => {
    document.addEventListener("keyup", listenForColorChanges);
  }, []);
  return (
    <div style={{ display: "flex" }}>
      {colorEntries.map(([name, value]) => {
        return (
          <div
            key={name}
            title={name}
            onClick={() => onChange(name)}
            style={{
              background: value,
              cursor: "pointer",
              width: 50,
              height: 20,
              marginLeft: 5,
              borderRadius: 4,
              borderBottom:
                selectedColor === name ? "2px solid #666" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function selectColorFromName(state, name) {
  return state.colors[name];
}

function rectInRect(needle, haystack) {
  // returns true if needle is entirely enclosed within
  const contained =
    haystack[0][0] <= needle[0][0] &&
    needle[1][0] <= haystack[1][0] &&
    haystack[0][1] <= needle[0][1] &&
    needle[1][1] <= haystack[1][1];
  return contained;
}

function pointInRect(point, rect) {
  if (point[0] > rect[0][0] && point[0] < rect[1][0]) {
    if (point[1] > rect[0][1] && point[1] < rect[1][1]) {
      return true;
    }
  }
  return false;
}

function rectsOverlap(top, bot) {
  const corners = [
    top[0], // top left
    top[1], // bottom right

    [
      // bottom left
      top[0][0],
      top[1][1],
    ],

    [
      // top right
      top[1][0],
      top[0][1],
    ],
  ];
  return corners.some((cornerPt) => pointInRect(cornerPt, bot));
}

function selectDimensionsForModule(state, xIdx, yIdx) {
  // returns bounding box for a module at given x/y index
  const actualModuleWidth = selectActualModuleWidth(state);
  const actualModuleHeight = selectActualModuleHeight(state);

  const x = xIdx * actualModuleWidth + (state.xOffset ?? 0);
  const y = yIdx * actualModuleHeight + (state.yOffset ?? 0);

  const bounds = [
    [x, y],
    [x + actualModuleWidth, y + actualModuleHeight],
  ];
  return bounds;
}

function Module({
  x,
  y,
  spacing,
  width,
  colors = [],
  orientation,
  position,
  onChange,
}) {
  const { dispatch, state } = React.useContext(MosaicContext);
  // const spacing = selectSpacing(state);

  const currentKeyDown = React.useRef(null);

  const handleTriangleClick = (idx) => (evt) => {
    if (evt.shiftKey || evt.altKey) {
      return;
    }
    if (evt.type === "click" || evt.buttons) {
      dispatch({
        type: "set_tile_color",
        payload: { position, color: state.selectedColor, index: idx },
      });
      evt.stopPropagation();
    }
  };
  const handleClick = (evt) => {
    if (evt.buttons) {
      if (evt.currentTarget.tagName === "g") {
        return;
      }
    }
    if (["z", ";"].includes(state.currentKey)) {
      dispatch;
      dispatch({
        type: "set_module_orientation",
        payload: { position, orientation: "sw" },
      });
      return;
    }
    if (["x", "q"].includes(state.currentKey)) {
      dispatch;
      dispatch({
        type: "set_module_orientation",
        payload: { position, orientation: "nw" },
      });
      return;
    }

    if (evt.altKey) {
      dispatch({ type: "toggle_module_orientation", payload: { position } });
    }
    if (evt.shiftKey) {
      dispatch({ type: "flip_module_order", payload: { position } });
    }
  };

  return (
    <>
      {orientation === "sw" ? (
        <g
          onClick={handleClick}
          onMouseEnter={handleClick}
          title={`${position.x}, ${position.y}`}
        >
          <polygon
            points={`
              ${x},${y}
              ${x + width},${y}
              ${x},${y + width}
              `}
            fill={selectColorFromName(state, colors[0] ?? "tusk")}
            stroke="white"
            style={{ paintOrder: "stroke" }}
            strokeWidth={0}
            onClick={handleTriangleClick(0)}
            onMouseEnter={handleTriangleClick(0)}
          ></polygon>
          <polygon
            points={`
              ${x + width + spacing},${y}
              ${x + width + spacing},${y + width}
              ${x + spacing},${y + width}
              `}
            stroke="white"
            style={{ paintOrder: "stroke" }}
            strokeWidth={0}
            fill={selectColorFromName(state, colors[1] ?? "tusk")}
            onClick={handleTriangleClick(1)}
            onMouseEnter={handleTriangleClick(1)}
          ></polygon>
        </g>
      ) : (
        <g
          onClick={handleClick}
          onMouseEnter={handleClick}
          title={`${position.x}, ${position.y}`}
        >
          <polygon
            points={`
              ${x},${y}
              ${x},${y + width}
              ${x + width},${y + width}
              `}
            fill={selectColorFromName(state, colors[0] ?? "tusk")}
            stroke="white"
            style={{ paintOrder: "stroke" }}
            strokeWidth={0}
            onClick={handleTriangleClick(0)}
            onMouseEnter={handleTriangleClick(0)}
          ></polygon>
          <polygon
            points={`
              ${x + spacing},${y}
              ${x + width + spacing},${y}
              ${x + width + spacing},${y + width}
              `}
            stroke="white"
            style={{ paintOrder: "stroke" }}
            strokeWidth={0}
            fill={selectColorFromName(state, colors[1] ?? "tusk")}
            onClick={handleTriangleClick(1)}
            onMouseEnter={handleTriangleClick(1)}
          ></polygon>
        </g>
      )}
    </>
  );
}

const Mosaic = React.forwardRef(RawMosaic);

function RawMosaic({ width, height }, ref) {
  const { state, dispatch } = React.useContext(MosaicContext);

  const { mosaic: mosaicData } = state;
  const setMosaicData = (updater) => {
    dispatch({ type: "update_mosaic", payload: { updater } });
  };

  const handleMosaicChange = (x, y) => (updater) => {
    setMosaicData((prev) => {
      const originalModuleData = prev[y][x];
      const nextData = updater(originalModuleData);
      const nextState = produce(prev, (draft) => {
        draft[y][x] = nextData;
      });
      return nextState;
    });
  };

  const actualModuleWidth = selectActualModuleWidth(state);
  const actualModuleHeight = selectActualModuleHeight(state);

  const actualRows = Math.ceil(height / actualModuleHeight);
  const actualCols = Math.ceil(width / actualModuleWidth);

  const maskPointsInches = [
    [0, 10.5],
    [0, 28.5],
    [108.5, 28.5],
    [108.5, 10.5],
    [89, 10.5],
    [89, 0],
    [59, 0],
    [59, 10.5],
    [0, 10.5],
  ];

  const maskedRegions = [
    [
      [0, 0],
      [58, 8],
    ],
    [
      [88, 0],
      [108.5, 8],
    ],
  ];
  const semiMaskedRegions = [
    [
      [0, 7],
      [58, 10.5],
    ],
    // [
    //   [58, 0],
    //   [108.5, 1],
    // ],
    [
      [88, 7],
      [108.5, 10.5],
    ],
  ];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ aspectRatio: width / height, width: "calc(100vw - 20px)" }}
      ref={ref}
    >
      <mask id="kitchen">
        <rect x={0} y={0} width={width} height={height} fill="#fff" />
        {maskedRegions.map((bbox, idx) => {
          return (
            <rect
              key={`${idx}masked`}
              x={SCALING * bbox[0][0]}
              y={SCALING * bbox[0][1]}
              width={SCALING * (bbox[1][0] - bbox[0][0])}
              height={SCALING * (bbox[1][1] - bbox[0][1])}
              fill="black"
            />
          );
        })}
        {/*        <polygon
          points={maskPointsInches
            .map(([x, y]) => `${x * SCALING},${y * SCALING}`)
            .join(', ')}
          fill="#fff"
        />
*/}{" "}
      </mask>
      <g mask="url('#kitchen')">
        {range(actualRows).map((rowY, y) => {
          return range(actualCols).map((rowX, x) => {
            // cell
            return (
              <Module
                key={`${x},${y}`}
                onChange={handleMosaicChange(x, y)}
                x={x * actualModuleWidth + (state.xOffset ?? 0)}
                y={y * actualModuleHeight + (state.yOffset ?? 0)}
                position={{ x, y }}
                spacing={selectSpacing(state)}
                width={state.tileWidthIn * SCALING}
                colors={[
                  mosaicData[y]?.[x]?.colors?.[0],
                  mosaicData[y]?.[x]?.colors?.[1],
                ]}
                orientation={mosaicData[y]?.[x]?.orientation}
              />
            );
          });
        })}
      </g>
      <g style={{ pointerEvents: "none" }}>
        {false &&
          maskedRegions.map((bbox, idx) => {
            return (
              <rect
                key={`${idx}masked`}
                x={SCALING * bbox[0][0]}
                y={SCALING * bbox[0][1]}
                width={SCALING * (bbox[1][0] - bbox[0][0])}
                height={SCALING * (bbox[1][1] - bbox[0][1])}
                fill="white"
              />
            );
          })}
        {false &&
          semiMaskedRegions.map((bbox, idx) => {
            return (
              <rect
                key={`${idx}semi`}
                x={SCALING * bbox[0][0]}
                y={SCALING * bbox[0][1]}
                width={SCALING * (bbox[1][0] - bbox[0][0])}
                height={SCALING * (bbox[1][1] - bbox[0][1])}
                fill="rgba(255,255,255,.3)"
              />
            );
          })}
      </g>
    </svg>
  );
}

function useDropHandler(onDropFile, el) {
  const [isDragging, setIsDragging] = React.useState();

  const dragHandler = (evt) => {
    evt.preventDefault();
    setIsDragging(true);
  };
  const dragEndHandler = (evt) => {
    evt.preventDefault();
    setIsDragging(false);
  };

  const dropHandler = (evt) => {
    evt.preventDefault();
    if (evt.dataTransfer.items) {
      [...evt.dataTransfer.items].forEach((item, i) => {
        if (item.kind === "file") {
          const file = item.getAsFile();
          // console.log(`doing something with file ${i}: ${file.name}`);
          onDropFile?.(file);
        }
      });
    } else {
      [...evt.dataTransfer.files].forEach((file, i) => {
        // console.log(`doing something with file ${i}: ${file.name}`);
        onDropFile?.(file);
      });
    }
    setIsDragging(false);
  };

  React.useEffect(() => {
    let target = el ? el : document;

    target.addEventListener("dragover", dragHandler);
    target.addEventListener("drop", dropHandler);
    target.addEventListener("dragend", dragEndHandler);
    target.addEventListener("dragleave", dragEndHandler);
    return () => {
      target.removeEventListener("dragover", dragHandler);
      target.removeEventListener("drop", dropHandler);
      target.removeEventListener("dragend", dragEndHandler);
      target.removeEventListener("dragleave", dragEndHandler);
    };
  }, []);

  return [isDragging];
}
