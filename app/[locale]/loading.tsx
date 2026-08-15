/**
 * Next.js renders this automatically while any `/[locale]/*` route
 * segment is loading — covers the login navigation and any other
 * server-rendered page transition under this layout.
 */
export default function LocaleLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="text-2xl font-bold text-primary">Teacher Hub</span>
        <span
          role="status"
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    </div>
  );
}
