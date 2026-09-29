/** played_on is a calendar date: format it in UTC so it never shifts a day. */
export function playedOnDate(playedOn: string) {
  return new Date(`${playedOn}T00:00:00Z`);
}
