import FacetGroup from "./FacetGroup.jsx";

export default function SearchFilters({ facetCounts, activeTypes, onToggleType }) {
  // Build facet data from counts
  const typeFacets = Object.entries(facetCounts.types || {}).map(([value, count]) => ({
    value,
    label: value,
    count,
  }));

  return (
    <aside className="md:col-span-1" aria-label="Search filters">
      <div className="bg-white border border-gray-200 rounded-md p-4 sticky top-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Filter Results</h2>

        {typeFacets.length > 0 && (
          <FacetGroup
            title="Content Type"
            facets={typeFacets}
            activeFilters={activeTypes}
            onToggle={onToggleType}
          />
        )}
      </div>
    </aside>
  );
}
