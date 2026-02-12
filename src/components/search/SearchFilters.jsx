import FacetGroup from "./FacetGroup.jsx";

export default function SearchFilters({ facetCounts, activeTypes, onToggleType }) {
  // Group types by category
  const groupedTypes = {};

  Object.entries(facetCounts.types || {}).forEach(([type, count]) => {
    let category, novel;

    if (type.startsWith("Annotations:")) {
      category = "Annotations";
      novel = type.replace("Annotations: ", "");
    } else if (type.startsWith("Working Notes:")) {
      category = "Working Notes";
      novel = type.replace("Working Notes: ", "");
    } else {
      category = "Site Content";
      novel = null; // Site content doesn't have sub-items
    }

    if (!groupedTypes[category]) {
      groupedTypes[category] = [];
    }

    groupedTypes[category].push({
      value: type, // Full type string for filtering
      label: novel || type, // Just the novel name or full label
      count,
    });
  });

  // Sort categories in logical order
  const categoryOrder = ["Annotations", "Working Notes", "Site Content"];
  const sortedCategories = categoryOrder.filter(cat => groupedTypes[cat]);

  return (
    <aside className="md:col-span-1" aria-label="Search filters">
      <div className="bg-white border border-gray-200 rounded-md p-4 sticky top-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Filter Results</h2>

        {sortedCategories.map((category) => (
          <FacetGroup
            key={category}
            title={category}
            facets={groupedTypes[category]}
            activeFilters={activeTypes}
            onToggle={onToggleType}
          />
        ))}
      </div>
    </aside>
  );
}
