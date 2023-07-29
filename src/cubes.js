import * as React from 'react';

const isaac = require('./isaac').default;
let prng = isaac(1);

function shuffle(arr) {
  var i = arr.length, j, temp;
  while(--i > 0){
    j = Math.floor(Math.random()*(i+1));
    temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
}

const range = (els) => Array.from(Array(els), (_el, idx) => idx);
export const Cubes = () => {
  const length = 20;
  const padding = 2;

  const [seed, setSeed] = React.useState(3);

  React.useEffect(() => {
    prng = isaac(seed)
    // prng.reset();
  }, [seed])

  const x = 0;
  const y = 0;

  const colors = {
    'tusk': '#f0ede8',
    'moonshine': '#e7ecf0',
    'french linen': '#dcdbd7',
    'salton sea': '#c8d3cb',
    'koi': '#f2b069',
  }

  // const total

  const colorOptions = ['tusk',
  'moonshine',
  'french linen',
  'salton sea',
  'tusk',
  'moonshine',
  'french linen',
  'salton sea',
  'tusk',
  'moonshine',
  'french linen',
  'salton sea',
  'koi',];


  return (
    <>
      <div>
      <label><span>seed: </span>
        <input type="text" value={seed} onChange={evt => setSeed(evt.currentTarget.value)} />
      </label>
      </div>
      <svg width="800" height="300" viewBox="0 0 800 300" >
        {range(30).map((stepX) => {
          return range(20).map((stepY) => {
            const colorIdxs = range(3).map(() => prng.range(0, colorOptions.length-1))

            return <EscherCube
              key={`${stepX},${stepY}`}
              x={
                x +
                stepX * moduleWidth(length, padding) +
                (stepY % 2 === 1 ? -1 * diamondWidth(length) - padding : 0)
              }
              y={y + stepY * (diamondHeight(length) + padding * 2)}
              length={length}
              padding={padding}
              colors={colorIdxs.map(idx => colors[colorOptions[idx]])}
            />;
          });
        })}
      </svg>
    </>
  );
};

const EscherCube = ({x, y, length = 20, padding = 0, colors=[]}) => {
  return (
    <>
      <EscherDiamond x={x} y={y + padding} color={colors[0]} />
      <EscherDiamond
        x={x + diamondWidth(length) * 2 + padding}
        y={y + padding}
        rotate={60}
        color={colors[1]}
      />
      <EscherDiamond x={x + padding / 2} y={y} rotate={-60}
        color={colors[2]}
      />
    </>
  );
};

const moduleWidth = (length, padding) => diamondWidth(length) * 2 + padding * 2;
const moduleHeight = (length, padding) =>
  diamondHeight(length) + diamondBelly(length) / 2 + padding;

const diamondBelly = (length) => length * Math.sin(Math.PI / 12);
const diamondWidth = (length) => length * Math.cos(Math.PI / 6);
const diamondHeight = (length) => length + length * Math.sin(Math.PI / 6);

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return `${this.x},${this.y}`;
  }

  from(distance, degrees) {
    const angle = degrees * ((2 * Math.PI) / 360);
    const nextX = this.x + Math.cos(angle) * distance;
    const nextY = this.y + Math.sin(angle) * distance;
    return new Point(nextX, nextY);
  }

  translated(x, y) {
    return new Point(this.x + x, this.y + y);
  }
}

function EscherDiamond({length = 20, x = 0, y = 0, rotate = 0, color="black"}) {
  const deg30 = Math.PI / 6;
  const startingPoint = new Point(x, y);
  const secondPoint = startingPoint.translated(0, length);
  const thirdPoint = secondPoint.from(length, 30);
  const fourthPoint = thirdPoint.translated(0, -1 * length);

  return (
    <polygon
      fill={color}
      points={`${startingPoint} ${secondPoint} ${thirdPoint} ${fourthPoint}`}
      transform={`rotate(${rotate},${startingPoint})`}
    />
  );
}
