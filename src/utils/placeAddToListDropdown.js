const DROPDOWN_MARGIN = 8;
const DROPDOWN_MAX_WIDTH = 300;
const DROPDOWN_MAX_HEIGHT = 400;

/**
 * Keep the list menu fully on screen. Poster cards clip overflow, and the
 * menu used to anchor its right edge to a left-side icon, so phones only
 * showed the chopped "movies" count inside the card border.
 */
export function placeAddToListDropdown(anchor, panelHeight, viewport) {
  const margin = DROPDOWN_MARGIN;
  const width = Math.min(DROPDOWN_MAX_WIDTH, Math.max(160, viewport.width - margin * 2));
  const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(120, viewport.height - margin * 2));
  const height = Math.min(panelHeight || maxHeight, maxHeight);

  let left = anchor.left;
  if (left + width > viewport.width - margin) {
    left = viewport.width - margin - width;
  }
  if (left < margin) left = margin;

  const spaceBelow = viewport.height - anchor.bottom - margin;
  const spaceAbove = anchor.top - margin;
  let top = anchor.bottom + margin;
  if (height > spaceBelow && spaceAbove > spaceBelow) {
    top = anchor.top - margin - height;
  }
  if (top < margin) top = margin;
  const bottomLimit = viewport.height - margin - height;
  if (top > bottomLimit) top = Math.max(margin, bottomLimit);

  return { top, left, width, maxHeight };
}
