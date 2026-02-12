import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faFilter } from "@fortawesome/free-solid-svg-icons";
import FacetGroup from "./FacetGroup.jsx";

export default function SearchFilters({ facetCounts, activeTypes, onToggleType }) {
  // Default to collapsed on mobile, expanded on desktop
  const [isExpanded, setIsExpanded] = useState(true);

  // Set initial state based on screen size
  useEffect(() => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    setIsExpanded(!isMobile);
  }, []);
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

  // Count active filters
  const activeFilterCount = activeTypes.length;

  return (
    <aside className="md:col-span-1" aria-label="Search filters">
      <div className="bg-white border border-gray-200 rounded-md p-4 md:sticky md:top-4">
        {/* Header with toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full mb-4 hover:text-ddnpblue transition-colors"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
        >
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500" aria-hidden="true" />
            <h2 className="text-xl font-bold text-gray-900">
              Filter Results
              {activeFilterCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({activeFilterCount} active)
                </span>
              )}
            </h2>
          </div>
          <FontAwesomeIcon
            icon={isExpanded ? faChevronUp : faChevronDown}
            className="text-gray-500"
            aria-hidden="true"
          />
        </button>

        {/* Collapsible filter groups */}
        {isExpanded && (
          <div>
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
        )}
      </div>
    </aside>
  );
}
