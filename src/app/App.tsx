import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import { LocaleProvider } from '../providers/LocaleProvider';

export const App = () => (
  <LocaleProvider>
    <RouterProvider router={router} />
  </LocaleProvider>
);
