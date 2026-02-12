import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export default function SearchInput({ query, onQueryChange, onSearch }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  const handleChange = (e) => {
    onQueryChange(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search the Working Notes, annotations, and content..."
          className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-ddnpblue focus:border-ddnpblue outline-none"
          aria-label="Search using keywords"
        />
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
