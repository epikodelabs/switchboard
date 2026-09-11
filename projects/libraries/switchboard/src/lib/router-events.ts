export const ROUTER_LOCATION_CHANGE_EVENT = 'switchboard:location-change';

export function dispatchRouterLocationChange(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      ROUTER_LOCATION_CHANGE_EVENT,
    ),
  );
}
