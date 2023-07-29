import * as React from 'react';

import {produce, current} from 'immer';


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
    case 'set_current_color':
      return produce(state, (draft) => {
        draft.selectedColor = action.payload.color;
      });
    case 'set_tile_color': {
      const {
        position: {x, y},
        color,
        index,
      } = action.payload;
      return produce(state, (draft) => {
        draft.mosaic[y][x].colors[index] = color;
      });
    }
    case 'update_mosaic':
      return produce(state, (draft) => {
        const nextMosaic = action.payload.updater(draft.mosaic);
        draft.mosaic = nextMosaic;
      });
    case 'update_module': {
      const {position, data} = action.payload;
      return produce(state, (draft) => {
        draft.mosaic[position.y][position.x] = {
          ...draft.mosaic[position.y][position.x],
          ...data,
        };
      });
    }
    case 'set_module_orientation': {
      const {
        position: {x, y},
        orientation,
      } = action.payload;
      return produce(state, (draft) => {
        draft.mosaic[y][x].orientation = orientation;
      });
    }
    case 'toggle_module_orientation': {
      const {
        position: {x, y},
      } = action.payload;
      return produce(state, (draft) => {
        const prev = draft.mosaic[y][x];
        draft.mosaic[y][x].orientation =
          prev.orientation === 'nw' ? 'sw' : 'nw';
      });
    }
    case 'flip_module_order': {
      const {
        position: {x, y},
      } = action.payload;
      return produce(state, (draft) => {
        draft.mosaic[y][x].colors.reverse();
      });
    }
    case 'update_tile_color': {
      const {position, color, index} = action.payload;
      return produce(state, (draft) => {
        state.mosaic[position.y][position.x].colors[index] = color;
      });
    }
    case 'set_tile_size': {
      return produce(state, (draft) => {
        // console.log(action.payload, typeof action.payload)
        draft.tileWidthIn = Number(action.payload);
        draft.yOffset = selectYOffset(current(draft));
      });
    }
    case 'set_spacing': {
      return produce(state, (draft) => {
        draft.spacingIn = Number(action.payload) / 16;
        draft.yOffset = selectYOffset(current(draft));
      });
    }
    case 'set_keypress': {
      return produce(state, (draft) => {
        draft.currentKey = action.payload;
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

  const {widthIn, heightIn, tileWidthIn, anchorY, anchorX, spacingIn} =
    statelike;

  const moduleWidth = 16 * tileWidthIn;
  const spacing = 16 * spacingIn;

  const actualModuleWidth = moduleWidth + 2 * spacing;
  const actualModuleHeight = moduleWidth + spacing;
  const horizontalModules = Math.ceil((widthIn * 16) / actualModuleWidth);
  const verticalModules = Math.ceil((heightIn * 16) / actualModuleHeight);

  const yOffset =
    anchorY === 'bottom'
      ? // we add the extra spacing here so that the bottom of the module is flush
        // with the bottom of the svg
        heightIn * 16 - verticalModules * actualModuleHeight
      : 0;

  const mosaic = range(verticalModules).map(() =>
    range(horizontalModules).map(() => ({colors: ['tusk', 'tusk']})),
  );
  return {...statelike, mosaic, yOffset};
};

const selectActualModuleWidth = (state) => {
  const moduleWidth = 16 * state.tileWidthIn;
  const spacing = 16 * state.spacingIn;
  const actualModuleWidth = moduleWidth + 2 * spacing;
  return actualModuleWidth;
};
const selectActualModuleHeight = (state) => {
  const moduleWidth = 16 * state.tileWidthIn;
  const spacing = 16 * state.spacingIn;
  const actualModuleHeight = moduleWidth + spacing;
  return actualModuleHeight;
};

const selectVerticalModulesForArea = (state) => {
  const actualModuleHeight = selectActualModuleHeight(state);
  return Math.ceil((state.heightIn * 16) / actualModuleHeight);
};

const selectYOffset = (state) => {
  const verticalModules = selectVerticalModulesForArea(state);
  const actualModuleHeight = selectActualModuleHeight(state);
  return state.anchorY === 'bottom'
    ? state.heightIn * 16 -
        verticalModules * actualModuleHeight +
        state.spacingIn * 16
    : 0;
};

const selectSpacing = (state) => 16 * state.spacingIn;

export const TriangleApp = () => {
  const initialState = {
    selectedColor: 'ember',
    widthIn: 9 * 12 + 1,
    heightIn: 24 + 4.5,
    tileWidthIn: 4,
    spacingIn: 1 / 8,
    anchorY: 'bottom',
    anchorX: 'left;',
    yOffset: 0,
    mosaic: [[]],
    colors: {
      tusk: '#d1d1d1',
      ember: '#e06f67',
      'tuolomne meadows': '#dfba5a',
      tidewater: '#688b83',
      'tiki blue': '#5494b2',
      'sea green': '#6e876d',
    },
    currentKey: null,
  };
  const [state, dispatch] = React.useReducer(
    mosaicReducer,
    initialState,
    initMosaicFromState,
  );

  const mosaicRef = React.useRef(null);

  const handleKeyPress = (evt) => {
    dispatch({type: 'set_keypress', payload: evt.key});
  };
  const clearKeyPress = evt => dispatch({type: 'set_keypress', payload: null});

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', clearKeyPress)
    return () => {window.removeEventListener('keydown', handleKeyPress);
    window.removeEventListener('keyup', clearKeyPress)}
  }, []);

  return (
    <MosaicContext.Provider value={{state, dispatch}}>
      <div>
        <Mosaic
          ref={mosaicRef}
          height={state.heightIn * 16}
          width={state.widthIn * 16}
          moduleWidth={state.tileWidth * 16}
          spacing={state.spacingIn * 16}
        />
      </div>
      <ColorWells
        colors={state.colors}
        selectedColor={state.selectedColor}
        onChange={(color) => {
          dispatch({type: 'set_current_color', payload: {color}});
        }}
      />
      <DownloadButton
        filename="mosaic.svg"
        getBlob={() => {
          return new Blob(
            [
              `<?xml version="1.0" standalone="no"?>
          ${mosaicRef.current.outerHTML}`.replace(
                '<svg',
                '<svg xmlns="http://www.w3.org/2000/svg"',
              ),
            ],
            {type: 'image/svg+xml;charset=utf-8'},
          );
        }}
      />
      <div style={{display: 'flex'}}>
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
                  type: 'set_tile_size',
                  payload: evt.currentTarget.value,
                });
              }}
            />
            4"
          </label>
        </div>

        <div style={{marginLeft: 20}}>
          <label>
            Grout Spacing Size:{' '}
            {Math.round(state.spacingIn * 16) % 2 === 0
              ? state.spacingIn * 8
              : state.spacingIn * 16}
            /{(state.spacingIn * 16) % 2 === 0 ? '8' : '16'}" <br /> 1/16"
            <input
              type="range"
              min="1"
              max="6"
              value={`${state.spacingIn * 16}`}
              onChange={(evt) => {
                dispatch({
                  type: 'set_spacing',
                  payload: evt.currentTarget.value,
                });
              }}
            />
            3/8"
          </label>
        </div>
      </div>
      <p>click or drag while holding shift, to flip the colors in a module</p>
      <p>
        click or drag while holding alt to rotate a module's orientation 90
        degrees
      </p>
    </MosaicContext.Provider>
  );
};

function DownloadButton({getBlob, filename}) {
  const linkRef = React.createRef();
  const [linkUrl, setLinkUrl] = React.useState();

  React.useEffect(() => {
    if (linkUrl !== '') {
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
        download
      </button>
      <a
        ref={linkRef}
        style={{display: 'none'}}
        href={linkUrl}
        download={filename}
        onClick={() => {
          console.log('clicked!');
        }}
      >
        hidden link
      </a>
    </>
  );
}

const MosaicContext = React.createContext();

function ColorWells({colors, selectedColor, onChange}) {
  return (
    <div style={{display: 'flex'}}>
      {Object.entries(colors).map(([name, value]) => {
        return (
          <div
            key={name}
            title={name}
            onClick={() => onChange(name)}
            style={{
              background: value,
              cursor: 'pointer',
              width: 50,
              height: 20,
              marginLeft: 5,
              borderRadius: 4,
              borderBottom:
                selectedColor === name ? '2px solid #666' : undefined,
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
  const {dispatch, state} = React.useContext(MosaicContext);
  // const spacing = selectSpacing(state);

  const currentKeyDown = React.useRef(null);

  const handleTriangleClick = (idx) => (evt) => {
    if (evt.shiftKey || evt.altKey) {
      return;
    }
    if (evt.type === 'click' || evt.buttons) {
      dispatch({
        type: 'set_tile_color',
        payload: {position, color: state.selectedColor, index: idx},
      });
      evt.stopPropagation();
    }
  };
  const handleClick = (evt) => {
    if (evt.buttons) {
      if (evt.currentTarget.tagName === 'g') {
        return;
      }
    }
    if (state.currentKey === 'z') {
      dispatch
      dispatch({type: 'set_module_orientation', payload: {position, orientation: 'sw'}});
      return;
    }
    if (evt.altKey) {
      dispatch({type: 'toggle_module_orientation', payload: {position}});
    }
    if (evt.shiftKey) {
      dispatch({type: 'flip_module_order', payload: {position}});
    }
  };

  return (
    <>
      {orientation === 'sw' ? (
        <g onClick={handleClick} onMouseEnter={handleClick}>
          <polygon
            points={`
              ${x},${y}
              ${x + width},${y}
              ${x},${y + width}
              `}
            fill={selectColorFromName(state, colors[0]) ?? 'green'}
            stroke="white"
            strokeWidth={spacing}
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
            strokeWidth={spacing}
            fill={selectColorFromName(state, colors[1]) ?? 'pink'}
            onClick={handleTriangleClick(1)}
            onMouseEnter={handleTriangleClick(1)}
          ></polygon>
        </g>
      ) : (
        <g onClick={handleClick} onMouseEnter={handleClick}>
          <polygon
            points={`
              ${x},${y}
              ${x},${y + width}
              ${x + width},${y + width}
              `}
            fill={selectColorFromName(state, colors[0]) ?? 'green'}
            stroke="white"
            strokeWidth={spacing}
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
            strokeWidth={spacing}
            fill={selectColorFromName(state, colors[1]) ?? 'pink'}
            onClick={handleTriangleClick(1)}
            onMouseEnter={handleTriangleClick(1)}
          ></polygon>
        </g>
      )}
    </>
  );
}

const Mosaic = React.forwardRef(RawMosaic);

function RawMosaic({width, height, moduleWidth, spacing}, ref) {
  const {state, dispatch} = React.useContext(MosaicContext);

  const {mosaic: mosaicData} = state;
  const setMosaicData = (updater) => {
    dispatch({type: 'update_mosaic', payload: {updater}});
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

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} ref={ref}>
      {mosaicData.map((row, y) => {
        return row.map((cell, x) => {
          return (
            <Module
              key={`${x},${y}`}
              onChange={handleMosaicChange(x, y)}
              x={x * actualModuleWidth}
              y={y * actualModuleHeight + (state.yOffset ?? 0)}
              position={{x, y}}
              spacing={selectSpacing(state)}
              width={state.tileWidthIn * 16}
              colors={[
                mosaicData[y][x]?.colors?.[0],
                mosaicData[y][x]?.colors?.[1],
              ]}
              orientation={mosaicData[y][x]?.orientation}
            />
          );
        });
      })}
    </svg>
  );
}
