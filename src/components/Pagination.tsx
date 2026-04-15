interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, pageCount, onPageChange }: PaginationProps) => {
  if (pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <div className="pagination">
      {pages.map((value) => (
        <button
          key={value}
          className={value === page ? 'active' : ''}
          type="button"
          onClick={() => onPageChange(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
};
