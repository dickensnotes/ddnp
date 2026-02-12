import FacetGroup from "./FacetGroup.jsx";

export default function SearchFilters({ facetCounts, activeCategories, onToggleCategory }) {
  // Build facet data from category counts
  const categoryFacets = Object.entries(facetCounts.categories || {})
    .sort(([a], [b]) => {
      // Sort order: Annotations, Working Notes, Site Content
      const order = { "Annotations": 1, "Working Notes": 2, "Site Content": 3 };
      return order[a] - order[b];
    })
    .map(([value, count]) => ({
      value,
      label: value,
      count,
    }));

  return (
    <aside className="md:col-span-1" aria-label="Search filters">
      <div className="bg-white border border-gray-200 rounded-md p-4 sticky top-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Filter Results</h2>

        {categoryFacets.length > 0 && (
          <FacetGroup
            title="Content Type"
            facets={categoryFacets}
            activeFilters={activeCategories}
            onToggle={onToggleCategory}
          />
        )}
      </div>
    </aside>
  );
}
