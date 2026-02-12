export default function SearchResult({ result }) {
  const { title, type, tags, url, excerpt } = result;

  // Determine badge styling based on type
  const getBadgeClass = () => {
    const baseClass = "inline-block px-2 py-0.5 rounded text-xs font-medium";

    if (type.startsWith("Annotations:")) {
      return `${baseClass} bg-green-100 text-green-800`;
    } else if (type.startsWith("Working Notes:")) {
      return `${baseClass} bg-ddnpblue/20 text-ddnpblue`;
    } else {
      return `${baseClass} bg-gray-200 text-gray-700`;
    }
  };

  // Check if excerpt adds new information beyond the title
  const shouldShowExcerpt = (title, excerpt) => {
    if (!excerpt) return false;

    // Normalize both strings for comparison
    const normalizeText = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const normalizedTitle = normalizeText(title);
    const normalizedExcerpt = normalizeText(excerpt);

    // Don't show if excerpt starts with the title
    if (normalizedExcerpt.startsWith(normalizedTitle)) {
      return false;
    }

    // Don't show if title starts with the excerpt
    if (normalizedTitle.startsWith(normalizedExcerpt)) {
      return false;
    }

    // Calculate word overlap - don't show if >70% of excerpt words are in title
    const titleWords = new Set(normalizedTitle.split(/\s+/));
    const excerptWords = normalizedExcerpt.split(/\s+/);
    const overlapCount = excerptWords.filter(word => titleWords.has(word)).length;
    const overlapRatio = overlapCount / excerptWords.length;

    return overlapRatio < 0.7; // Show only if less than 70% overlap
  };

  // Truncate excerpt to ~150 characters
  const truncatedExcerpt = excerpt && excerpt.length > 150
    ? excerpt.substring(0, 150) + "..."
    : excerpt;

  const showExcerpt = shouldShowExcerpt(title, excerpt);

  return (
    <article className="border border-gray-200 rounded-md p-4 hover:shadow-md transition-shadow">
      <a href={url} className="group block mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-ddnpblue transition-colors line-clamp-2">
          {title}
        </h3>
        {showExcerpt && truncatedExcerpt && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {truncatedExcerpt}
          </p>
        )}
      </a>

      <div className="flex flex-wrap items-center gap-2">
        <span className={getBadgeClass()}>{type}</span>

        {tags && tags.length > 0 && (
          <>
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{tags.length - 3} more
              </span>
            )}
          </>
        )}
      </div>
    </article>
  );
}
