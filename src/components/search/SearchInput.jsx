import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function SearchInput({ query, onQueryChange, onSearch, onReset, hasQuery }) {
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
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search the Working Notes, annotations, and content..."
            className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-ddnpblue focus:border-ddnpblue outline-none"
            aria-label="Search using keywords"
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
          className="px-6 py-3 bg-ddnpblue text-white rounded-md hover:bg-ddnpblue/90 transition-colors flex items-center gap-2"
          aria-label="Submit search"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
          <span>Search</span>
        </button>
      </div>
    </form>
  );
}
