import { describe, expect, it } from "vitest";

import { type FriendProfile, groupFriendships } from "./group-friendships";

const me: FriendProfile = { id: "me", username: "me", display_name: "Me" };
const ana: FriendProfile = { id: "ana", username: "ana", display_name: "Ana" };
const bob: FriendProfile = { id: "bob", username: "bob", display_name: "Bob" };
const carla: FriendProfile = { id: "carla", username: "carla", display_name: "Carla" };
const dan: FriendProfile = { id: "dan", username: "dan", display_name: "Dan" };

describe("groupFriendships", () => {
  it("sorts rows into friends, incoming and outgoing from my point of view", () => {
    const groups = groupFriendships(
      [
        { status: "accepted", requester: me, addressee: bob }, // I asked, they accepted
        { status: "accepted", requester: ana, addressee: me }, // they asked, I accepted
        { status: "pending", requester: carla, addressee: me },
        { status: "pending", requester: me, addressee: dan },
      ],
      me.id,
    );

    expect(groups.friends).toEqual([ana, bob]);
    expect(groups.incoming).toEqual([carla]);
    expect(groups.outgoing).toEqual([dan]);
  });

  it("orders each list by display name", () => {
    const groups = groupFriendships(
      [
        { status: "accepted", requester: me, addressee: carla },
        { status: "accepted", requester: me, addressee: ana },
      ],
      me.id,
    );
    expect(groups.friends.map((f) => f.display_name)).toEqual(["Ana", "Carla"]);
  });

  it("returns empty lists when there are no friendships", () => {
    expect(groupFriendships([], me.id)).toEqual({ friends: [], incoming: [], outgoing: [] });
  });
});
