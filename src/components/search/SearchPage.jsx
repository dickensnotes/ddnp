import { useState, useEffect, useMemo } from "react";
import { initSearch, search, getAllDocs } from "../../lib/search.js";
import LoadingSpinner from "./LoadingSpinner.jsx";
import SearchInput from "./SearchInput.jsx";
import SearchControls from "./SearchControls.jsx";
import SearchFilters from "./SearchFilters.jsx";
import SearchResults from "./SearchResults.jsx";

// Helper function to categorize document types
function getCategory(type) {
  if (type.startsWith("Annotations:")) return "Annotations";
  if (type.startsWith("Working Notes:")) return "Working Notes";
  return "Site Content";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategories, setActiveCategories] = useState([]);
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
        const urlCategories = params.get("category") ? params.get("category").split(",") : [];
        const urlSort = params.get("sort") || "relevance";
        const urlPage = parseInt(params.get("page")) || 1;

        setQuery(urlQuery);
        setActiveCategories(urlCategories);
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
    if (activeCategories.length > 0) params.set("category", activeCategories.join(","));
    if (sortBy !== "relevance") params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.pushState({}, "", newUrl);
  }, [activeCategories, sortBy, currentPage, isSearchInitialized, hasSearched, query]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get("query") || "";
      const urlCategories = params.get("category") ? params.get("category").split(",") : [];
      const urlSort = params.get("sort") || "relevance";
      const urlPage = parseInt(params.get("page")) || 1;

      setQuery(urlQuery);
      setActiveCategories(urlCategories);
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
      const rawResults = search(searchQuery, {
        boost: { title: 20, content: 10, tags: 10 },
        prefix: true,
        fuzzy: 0.2,
      });

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
    setActiveCategories([]);
    setSortBy("relevance");
    setCurrentPage(1);
    setHasSearched(false);
    window.history.pushState({}, "", window.location.pathname);
  };

  // Apply filters to results
  const filteredResults = useMemo(() => {
    if (activeCategories.length === 0) return results;
    return results.filter((result) => {
      const category = getCategory(result.type);
      return activeCategories.includes(category);
    });
  }, [results, activeCategories]);

  // Apply sorting to filtered results
  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];

    if (sortBy === "atoz") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "ztoa") {
      sorted.sort((a, b) => b.title.localeCompare(a.title));
    }
    // For 'relevance', keep the order from search results

    return sorted;
  }, [filteredResults, sortBy]);

  // Calculate facet counts from ALL documents (not filtered results)
  const facetCounts = useMemo(() => {
    const allDocs = getAllDocs();
    const categories = {};

    Object.values(allDocs).forEach((doc) => {
      const category = getCategory(doc.type);
      categories[category] = (categories[category] || 0) + 1;
    });

    return { categories };
  }, [isSearchInitialized]);

  // Handle filter toggle
  const handleToggleCategory = (category) => {
    setActiveCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
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
          activeCategories={activeCategories}
          onToggleCategory={handleToggleCategory}
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
