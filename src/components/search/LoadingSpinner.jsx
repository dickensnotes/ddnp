import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function LoadingSpinner({ message = "Loading search index..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
      <FontAwesomeIcon
        icon={faSpinner}
        className="text-ddnpblue text-4xl mb-4 animate-spin"
        aria-hidden="true"
      />
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}
