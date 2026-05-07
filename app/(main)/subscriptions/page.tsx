export default function SubscriptionsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Manage the topics you follow</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-foreground">No subscriptions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Follow topics like React, Rust, or LLMs to get tailored updates
        </p>
      </div>
    </div>
  );
}
