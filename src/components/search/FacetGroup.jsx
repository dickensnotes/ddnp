import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import FacetItem from "./FacetItem.jsx";

export default function FacetGroup({ title, facets, activeFilters, onToggle }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const allValues = facets.map(f => f.value);
  const allSelected = allValues.length > 0 && allValues.every(v => activeFilters.includes(v));
  const noneSelected = allValues.every(v => !activeFilters.includes(v));

  const handleSelectAll = () => {
    // If all are selected, deselect all; otherwise select all
    if (allSelected) {
      allValues.forEach(v => {
        if (activeFilters.includes(v)) onToggle(v);
      });
    } else {
      allValues.forEach(v => {
        if (!activeFilters.includes(v)) onToggle(v);
      });
    }
  };

  return (
    <div className="mb-4 border-b border-gray-200 pb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left mb-2 hover:text-ddnpblue transition-colors"
        aria-expanded={isExpanded}
      >
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <FontAwesomeIcon
          icon={isExpanded ? faChevronUp : faChevronDown}
          className="text-gray-500 text-sm"
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="space-y-1">
          {facets.length > 1 && (
            <button
              onClick={handleSelectAll}
              className="text-xs text-ddnpblue hover:text-ddnpblue/80 transition-colors px-2 py-1"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
          {facets.map((facet) => (
            <FacetItem
              key={facet.value}
              label={facet.label}
              count={facet.count}
              isActive={activeFilters.includes(facet.value)}
              onToggle={() => onToggle(facet.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
