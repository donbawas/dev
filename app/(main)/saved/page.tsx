export default function SavedPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Saved</h1>
        <p className="text-sm text-muted-foreground">Your bookmarked items</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-foreground">Nothing saved yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Bookmark items from your feed to find them here
        </p>
      </div>
    </div>
  );
}
