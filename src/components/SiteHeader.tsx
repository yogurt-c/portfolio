import type { Profile } from "@/types";

export default function SiteHeader({ profile }: { profile: Profile }) {
  return (
    <header className="site-hd">
      <div className="hd-left">
        <h1 className="name">{profile.name}</h1>
        {profile.role && <div className="role">{profile.role}</div>}
        {profile.bio && <p className="bio">{profile.bio}</p>}
      </div>
      <div className="hd-meta">
        {profile.location && (
          <div>
            <b>{profile.location}</b>
          </div>
        )}
        {profile.email && <div>{profile.email}</div>}
        {profile.github && <div>{profile.github}</div>}
      </div>
    </header>
  );
}
