export type FriendProfile = {
  id: string;
  username: string | null;
  display_name: string;
};

export type FriendshipRow = {
  status: "pending" | "accepted";
  requester: FriendProfile;
  addressee: FriendProfile;
};

export type FriendshipGroups = {
  /** Accepted, from either direction. */
  friends: FriendProfile[];
  /** Pending requests others sent me. */
  incoming: FriendProfile[];
  /** Pending requests I sent. */
  outgoing: FriendProfile[];
};

/** Sorts the current user's friendships into the three lists the page shows. */
export function groupFriendships(rows: FriendshipRow[], myId: string): FriendshipGroups {
  const groups: FriendshipGroups = { friends: [], incoming: [], outgoing: [] };

  for (const row of rows) {
    const iSent = row.requester.id === myId;
    const other = iSent ? row.addressee : row.requester;
    if (row.status === "accepted") groups.friends.push(other);
    else if (iSent) groups.outgoing.push(other);
    else groups.incoming.push(other);
  }

  const byName = (a: FriendProfile, b: FriendProfile) =>
    a.display_name.localeCompare(b.display_name);
  groups.friends.sort(byName);
  groups.incoming.sort(byName);
  groups.outgoing.sort(byName);
  return groups;
}
