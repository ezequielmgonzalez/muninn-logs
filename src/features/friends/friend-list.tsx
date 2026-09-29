import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import type { FriendProfile } from "./group-friendships";

/** A list of people, each with its own row of actions. */
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
        <li
          key={person.id}
          className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
        >
          <div className="flex min-w-0 flex-col">
            {linkToProfile && person.username ? (
              <Link
                href={`/friends/${person.username}`}
                className="type-body-strong truncate text-ink-body underline-offset-4 hover:underline"
              >
                {person.display_name}
              </Link>
            ) : (
              <span className="type-body-strong truncate text-ink-body">{person.display_name}</span>
            )}
            {person.username && (
              <span className="truncate text-sm text-ink-muted">@{person.username}</span>
            )}
          </div>
          <div className="flex shrink-0 gap-2">{actions(person)}</div>
        </li>
      ))}
    </ul>
  );
}
