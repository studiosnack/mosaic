import {React} from 'react';
import * as ReactDOM from 'react-dom/client';

import {Cubes} from './cubes'

const appEl = document.getElementById('app');

if (appEl) {
  const root = ReactDOM.createRoot(appEl);
  root.render(<Cubes />)
}
