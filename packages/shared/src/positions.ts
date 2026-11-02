/** Card positions start this far apart, so a card can be dropped between two others many times. */
export const POSITION_GAP = 1000;

/**
 * Positions for `count` cards moved into a column without a place picked for them, as from a status menu: they go to
 * the top, above `firstPosition` (the column's current top card, if any), in the order given.
 */
export function positionsAtTop(firstPosition: number | null | undefined, count: number): number[] {
    const top = firstPosition ?? POSITION_GAP * (count + 1);
    return Array.from({ length: count }, (_, index) => top - POSITION_GAP * (count - index));
}
