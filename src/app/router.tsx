import { createHashRouter } from 'react-router-dom';

import { AppShell } from '../components/AppShell';
import { normalizeBasePath } from '../lib/routing';
import { HomePage } from '../pages/HomePage';
import { JournalPage } from '../pages/JournalPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PaperDetailPage } from '../pages/PaperDetailPage';
import { TrendsPage } from '../pages/TrendsPage';

const basename = normalizeBasePath();

export const router = createHashRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      errorElement: <NotFoundPage />,
      children: [
        {
          index: true,
          element: <HomePage />
        },
        {
          path: 'journals/:journalSlug',
          element: <JournalPage />
        },
        {
          path: 'papers/:paperId',
          element: <PaperDetailPage />
        },
        {
          path: 'trends',
          element: <TrendsPage />
        }
      ]
    }
  ],
  {
    basename: basename === '/' ? undefined : basename.replace(/\/$/, '')
  }
);
