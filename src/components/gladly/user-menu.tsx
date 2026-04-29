import { ChevronDown } from "lucide-react";

export function UserMenu({
  initials,
  name
}: {
  initials: string;
  name: string;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
      type="button"
    >
      <span className="h-8 w-8 rounded-full bg-gladly-green text-white text-xs font-medium flex items-center justify-center">
        {initials}
      </span>
      <span className="hidden sm:inline">{name}</span>
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </button>
  );
}
