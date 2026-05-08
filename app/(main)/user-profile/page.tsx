import { UserProfile } from '@clerk/nextjs';

export default function UserProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, connected apps and security settings
        </p>
      </div>
      <UserProfile routing="hash" />
    </div>
  );
}
