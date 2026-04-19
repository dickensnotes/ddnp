import SearchResult from "./SearchResult.jsx";
import Pagination from "./Pagination.jsx";

export default function SearchResults({ results, currentPage, resultsPerPage, onPageChange, hasSearched }) {
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentResults = results.slice(startIndex, endIndex);

  if (!hasSearched) {
    return (
      <div className="md:col-span-3">
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <p className="text-gray-600 text-lg">
            Enter a search term to find content across the Working Notes, annotations, and site pages.
          </p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="md:col-span-3">
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <p className="text-gray-600 text-lg">
            No results found. Try different search terms or filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="md:col-span-3">
      <div className="space-y-4">
        {currentResults.map((result, index) => (
          <SearchResult key={`${result.id}-${index}`} result={result} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
