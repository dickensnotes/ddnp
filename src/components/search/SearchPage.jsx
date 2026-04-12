import { useState, useEffect, useMemo } from "react";
import { initSearch, search } from "../../lib/search.js";
import LoadingSpinner from "./LoadingSpinner.jsx";
import SearchInput from "./SearchInput.jsx";
import SearchControls from "./SearchControls.jsx";
import SearchFilters from "./SearchFilters.jsx";
import SearchResults from "./SearchResults.jsx";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTypes, setActiveTypes] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchInitialized, setIsSearchInitialized] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const resultsPerPage = 20;

  // Initialize search index on mount
  useEffect(() => {
    async function init() {
      try {
        await initSearch();
        setIsSearchInitialized(true);

        // Read query from URL
        const params = new URLSearchParams(window.location.search);
        const urlQuery = params.get("query") || "";
        const urlTypes = params.get("type") ? params.get("type").split(",") : [];
        const urlSort = params.get("sort") || "relevance";
        const urlPage = parseInt(params.get("page")) || 1;

        setQuery(urlQuery);
        setActiveTypes(urlTypes);
        setSortBy(urlSort);
        setCurrentPage(urlPage);

        if (urlQuery) {
          performSearch(urlQuery);
          setHasSearched(true);
        }
      } catch (error) {
        console.error("Failed to initialize search:", error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Update URL when state changes (but not query - only on search submission)
  useEffect(() => {
    if (!isSearchInitialized || !hasSearched) return;

    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (activeTypes.length > 0) params.set("type", activeTypes.join(","));
    if (sortBy !== "relevance") params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  }, [activeTypes, sortBy, currentPage, isSearchInitialized, hasSearched, query]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get("query") || "";
      const urlTypes = params.get("type") ? params.get("type").split(",") : [];
      const urlSort = params.get("sort") || "relevance";
      const urlPage = parseInt(params.get("page")) || 1;

      setQuery(urlQuery);
      setActiveTypes(urlTypes);
      setSortBy(urlSort);
      setCurrentPage(urlPage);

      if (urlQuery) {
        performSearch(urlQuery);
        setHasSearched(true);
      } else {
        setResults([]);
        setHasSearched(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Perform search
  const performSearch = (searchQuery) => {
    if (!searchQuery.trim()) {
      // Clear search results
      setResults([]);
      setHasSearched(false);
      return;
    }

    try {
      const rawResults = search(searchQuery);

      setResults(rawResults);
      setCurrentPage(1); // Reset to first page on new search
      setHasSearched(true);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    }
  };

  // Handle search submission
  const handleSearch = () => {
    performSearch(query);
  };

  // Handle reset/clear
  const handleReset = () => {
    setQuery("");
    setResults([]);
    setActiveTypes([]);
    setSortBy("relevance");
    setCurrentPage(1);
    setHasSearched(false);
    window.history.pushState({}, "", window.location.pathname);
  };

  // Apply filters to results
  const filteredResults = useMemo(() => {
    if (activeTypes.length === 0) return results;
    return results.filter((result) => activeTypes.includes(result.type));
  }, [results, activeTypes]);

  // Apply sorting to filtered results
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];

    if (sortBy === "atoz") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "ztoa") {
      sorted.sort((a, b) => b.title.localeCompare(a.title));
    }
    // For 'relevance', group by type priority then sort by score within each group
    // Working Notes first, then Annotations, then Site Content
    if (sortBy === "relevance") {
      const typePriority = (type) => {
        if (type?.startsWith("Working Notes:")) return 0;
        if (type?.startsWith("Annotations:")) return 1;
        return 2;
      };
      sorted.sort((a, b) => {
        const priorityDiff = typePriority(a.type) - typePriority(b.type);
        if (priorityDiff !== 0) return priorityDiff;
        return b.score - a.score;
      });
    }

    return sorted;
  }, [filteredResults, sortBy]);

  // Calculate facet counts from current search results
  const facetCounts = useMemo(() => {
    const types = {};

    results.forEach((result) => {
      const type = result.type;
      if (type) {
        types[type] = (types[type] || 0) + 1;
      }
    });

    return { types };
  }, [results]);

  // Handle filter toggle
  const handleToggleType = (type) => {
    setActiveTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1); // Reset to first page when sort changes
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <SearchInput
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onReset={handleReset}
        hasQuery={query.length > 0}
      />

      {hasSearched && (
        <SearchControls
          resultCount={sortedResults.length}
          query={query}
          sortBy={sortBy}
          onSortChange={handleSortChange}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SearchFilters
          facetCounts={facetCounts}
          activeTypes={activeTypes}
          onToggleType={handleToggleType}
        />

        <SearchResults
          results={sortedResults}
          currentPage={currentPage}
          resultsPerPage={resultsPerPage}
          onPageChange={handlePageChange}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  );
}
