export default function FacetItem({ label, count, isActive, onToggle }) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 px-2 rounded transition-colors">
      <input
        type="checkbox"
        checked={isActive}
        onChange={onToggle}
        className="w-4 h-4 text-ddnpblue border-gray-300 rounded focus:ring-2 focus:ring-ddnpblue cursor-pointer"
      />
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className="text-xs text-gray-500 font-medium">{count}</span>
    </label>
  );
}
