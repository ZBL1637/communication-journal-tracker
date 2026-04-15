import { Link } from 'react-router-dom';

import type { JournalSummary } from '../types/data';

export const JournalBadge = ({ journal }: { journal: JournalSummary }) => (
  <Link className="journal-badge" to={`/journals/${journal.slug}`}>
    <span>{journal.name}</span>
    <small>{journal.paperCount}</small>
  </Link>
);
