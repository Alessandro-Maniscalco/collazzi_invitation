import React from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FlorenceMap } from "@/components/invitation/florence-map";

const leafletMocks = vi.hoisted(() => ({
  map: vi.fn(),
  setZoomAround: vi.fn(),
}));

vi.mock("leaflet", () => {
  const mapInstance = {
    fitBounds: vi.fn(),
    getMaxZoom: () => 19,
    getMinZoom: () => 0,
    getZoom: () => 15,
    invalidateSize: vi.fn(),
    mouseEventToContainerPoint: () => ({ x: 120, y: 80 }),
    remove: vi.fn(),
    setZoomAround: leafletMocks.setZoomAround,
  };

  leafletMocks.map.mockReturnValue(mapInstance);

  return {
    latLngBounds: () => ({ extend: vi.fn() }),
    map: leafletMocks.map,
    tileLayer: () => ({ addTo: vi.fn() }),
  };
});

class ResizeObserverMock {
  disconnect() {}
  observe() {}
}

vi.stubGlobal("React", React);
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

afterEach(() => {
  cleanup();
  leafletMocks.map.mockClear();
  leafletMocks.setZoomAround.mockClear();
});

describe("FlorenceMap", () => {
  it("zooms around the pointer only when scroll uses Command or Control", async () => {
    render(React.createElement(FlorenceMap, { suggestions: [] }));

    const mapRegion = screen.getByRole("region", {
      name: "Interactive map of Florence:",
    });

    await waitFor(() => expect(leafletMocks.map).toHaveBeenCalledOnce());

    fireEvent.wheel(mapRegion, { deltaY: -100 });
    expect(leafletMocks.setZoomAround).not.toHaveBeenCalled();

    fireEvent.wheel(mapRegion, { deltaY: -100, metaKey: true });
    expect(leafletMocks.setZoomAround).toHaveBeenLastCalledWith({ x: 120, y: 80 }, 16);

    fireEvent.wheel(mapRegion, { ctrlKey: true, deltaY: 100 });
    expect(leafletMocks.setZoomAround).toHaveBeenLastCalledWith({ x: 120, y: 80 }, 14);
  });
});
