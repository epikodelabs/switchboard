import {
  OUTLET_ACTIVATE_EVENT,
  OUTLET_DEACTIVATE_EVENT,
  FRAME_LOCATION_CHANGE_EVENT,
  dispatchOutletLifecycleEvent,
  dispatchFrameLocationChange,
} from '../lib/frame-events';

describe('Switchboard frame events', () => {
  it('uses only switchboard-namespaced events', () => {
    expect(OUTLET_ACTIVATE_EVENT).toBe('switchboard:outlet-activate');
    expect(OUTLET_DEACTIVATE_EVENT).toBe('switchboard:outlet-deactivate');
    expect(FRAME_LOCATION_CHANGE_EVENT).toBe('switchboard:location-change');
  });

  it('dispatches one outlet event', () => {
    const target = new EventTarget();
    const listener = jasmine.createSpy('listener');
    target.addEventListener(OUTLET_ACTIVATE_EVENT, listener);

    dispatchOutletLifecycleEvent(target, OUTLET_ACTIVATE_EVENT, { id: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dispatches one location event', () => {
    const listener = jasmine.createSpy('listener');
    window.addEventListener(FRAME_LOCATION_CHANGE_EVENT, listener);

    try {
      dispatchFrameLocationChange();
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(FRAME_LOCATION_CHANGE_EVENT, listener);
    }
  });
});

