import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faSpinner, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function SearchInput({ query, onQueryChange, onSearch, onReset, hasQuery, isLoading = false }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  const handleChange = (e) => {
    onQueryChange(e.target.value);
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-6">
        <div className="flex-1 relative mr-4">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search the Working Notes, annotations, and content..."
            className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-ddnpblue focus:border-ddnpblue outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Search using keywords"
            disabled={isLoading}
          />
          {hasQuery && (
            <button
              type="button"
              onClick={handleReset}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <FontAwesomeIcon icon={faXmark} className="text-lg" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-ddnpblue text-white rounded-md hover:bg-ddnpblue/90 transition-colors flex items-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Submit search"
          aria-busy={isLoading}
          disabled={isLoading}
        >
          <FontAwesomeIcon
            icon={isLoading ? faSpinner : faMagnifyingGlass}
            className={isLoading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          <span>Search</span>
        </button>
      </div>
    </form>
  );
}
