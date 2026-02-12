export default function SearchControls({ resultCount, query, sortBy, onSortChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
      <div className="text-gray-700" role="status" aria-live="polite">
        {query ? (
          <span>
            <strong>{resultCount}</strong> result{resultCount !== 1 ? 's' : ''} for{' '}
            <strong>"{query}"</strong>
          </span>
        ) : (
          <span>
            <strong>{resultCount}</strong> total document{resultCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm text-gray-600 whitespace-nowrap">
          Sort by:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ddnpblue focus:border-ddnpblue outline-none bg-white"
        >
          <option value="relevance">Relevance</option>
          <option value="atoz">Name (A-Z)</option>
          <option value="ztoa">Name (Z-A)</option>
        </select>
      </div>
    </div>
  );
}
