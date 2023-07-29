import {React} from 'react';
import * as ReactDOM from 'react-dom/client';

import {TriangleApp} from './triangles'

const appEl = document.getElementById('app');

if (appEl) {
  const root = ReactDOM.createRoot(appEl);
  root.render(<TriangleApp />)
}
