import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import type { FriendProfile } from "./group-friendships";

/** People as notebook rows: a monogram, name and @username, then the row's actions. */
export function FriendList({
  people,
  actions,
  linkToProfile = false,
}: {
  people: FriendProfile[];
  actions: (person: FriendProfile) => ReactNode;
  /** Link names to their profile: only for accepted friends, whose stats are visible. */
  linkToProfile?: boolean;
}) {
  return (
    <ul className="flex flex-col">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 border-b border-ink-body/14 py-3 last:border-b-0">
          <span
            aria-hidden
            className="flex size-[42px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-bronze font-display text-[17px] font-bold text-ink"
          >
            {person.display_name.charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            {linkToProfile && person.username ? (
              <Link
                href={`/friends/${person.username}`}
                className="truncate text-base font-semibold text-ink-body underline-offset-4 hover:underline"
              >
                {person.display_name}
              </Link>
            ) : (
              <span className="truncate text-base font-semibold text-ink-body">{person.display_name}</span>
            )}
            {person.username && <span className="truncate text-sm text-ink-muted">@{person.username}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions(person)}</div>
        </li>
      ))}
    </ul>
  );
}
