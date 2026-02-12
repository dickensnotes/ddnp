export default function SearchResult({ result }) {
  const { title, type, tags, url } = result;

  // Determine badge styling based on type
  const getBadgeClass = () => {
    const baseClass = "inline-block px-2.5 py-1 rounded-full text-xs font-medium";

    if (type.startsWith("Annotations:")) {
      return `${baseClass} bg-green-100 text-green-800`;
    } else if (type.startsWith("Working Notes:")) {
      return `${baseClass} bg-ddnpblue/20 text-ddnpblue`;
    } else {
      return `${baseClass} bg-gray-200 text-gray-700`;
    }
  };

  return (
    <article className="border border-gray-200 rounded-md p-4 hover:shadow-md transition-shadow">
      <a href={url} className="group">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-ddnpblue transition-colors">
          {title}
        </h3>
      </a>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={getBadgeClass()}>{type}</span>
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
