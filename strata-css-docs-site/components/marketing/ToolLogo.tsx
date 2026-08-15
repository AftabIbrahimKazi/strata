export type ToolId = "npm" | "github" | "socket" | "snyk" | "codeql";

// Simplified, monochrome-friendly marks (not pixel copies of each brand's
// wordmark) — enough to be recognizable in a small logo-wall card without
// reproducing trademarked artwork exactly.
export default function ToolLogo({ id }: { id: ToolId }) {
  switch (id) {
    case "npm":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="4" fill="#CB3837" />
          <path
            fill="#fff"
            d="M4 8h20v12h-6v-9h-3v9H9v-9H7v9H4V8Z"
          />
        </svg>
      );
    case "github":
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.12.82-.27.82-.6 0-.3-.01-1.08-.02-2.12-3.34.75-4.04-1.65-4.04-1.65-.55-1.44-1.34-1.83-1.34-1.83-1.09-.77.08-.75.08-.75 1.21.09 1.84 1.28 1.84 1.28 1.07 1.87 2.81 1.33 3.5 1.02.11-.79.42-1.33.76-1.64-2.67-.31-5.47-1.38-5.47-6.15 0-1.36.47-2.47 1.24-3.34-.12-.31-.54-1.57.12-3.28 0 0 1.01-.33 3.3 1.28a11.2 11.2 0 0 1 6.01 0c2.29-1.61 3.3-1.28 3.3-1.28.66 1.71.24 2.97.12 3.28.77.87 1.24 1.98 1.24 3.34 0 4.78-2.81 5.84-5.48 6.14.43.38.81 1.13.81 2.29 0 1.65-.02 2.98-.02 3.39 0 .33.22.72.83.6C20.56 22.34 24 17.73 24 12.3 24 5.5 18.63 0 12 0Z" />
        </svg>
      );
    case "socket":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="6" fill="#8E75FF" />
          <circle cx="14" cy="11" r="5" fill="none" stroke="#fff" strokeWidth="2" />
          <path d="M14 16v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "snyk":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="6" fill="#4C4A73" />
          <path
            d="M14 5 6 8.5v6.2c0 4.6 3.3 7.4 8 8.3 4.7-.9 8-3.7 8-8.3V8.5L14 5Z"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "codeql":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="6" fill="#1B1F23" />
          <circle cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="1.8" />
          <path d="m16.5 16.5 5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}
