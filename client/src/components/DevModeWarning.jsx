export default function DevModeWarning() {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-lg mx-auto px-6 py-3">
        <div className="flex items-start gap-3">
          <svg 
            className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-900">
              Development Mode
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Data is stored in memory and will be lost when the server restarts. This is an MVP for testing only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
