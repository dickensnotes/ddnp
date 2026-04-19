import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function LoadingSpinner({ message = "Loading search index..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 border border-gray-200 rounded-md" role="status" aria-live="polite">
      <FontAwesomeIcon
        icon={faSpinner}
        className="text-ddnpblue text-3xl mb-3 animate-spin"
        aria-hidden="true"
      />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
