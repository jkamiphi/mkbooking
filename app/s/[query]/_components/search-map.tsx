"use client";

import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from "@vis.gl/react-google-maps";

export type SearchMapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price: string | null;
  structureType: string;
  href: string;
};

type SearchMapProps = {
  markers: SearchMapMarker[];
  center: { lat: number; lng: number };
  showPrices: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "";

function MarkerWithInfoWindow({
  marker,
  showPrices,
  isSelected,
  onSelect,
}: {
  marker: SearchMapMarker;
  showPrices: boolean;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  return (
    <>
      <AdvancedMarker
        position={{ lat: marker.lat, lng: marker.lng }}
        onClick={() => onSelect(isSelected ? null : marker.id)}
      >
        <div
          className={`
            relative flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold
            shadow-lg transition-all duration-200
            ${
              isSelected
                ? "scale-110 border-[#0359A8] bg-[#0359A8] text-white ring-4 ring-[#0359A8]/25"
                : "border-white/80 bg-white text-neutral-900 hover:scale-105 hover:bg-[#0359A8]/5"
            }
          `}
        >
          <span
            className={`
              absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1 rotate-45 border-r border-b
              ${isSelected ? "border-[#0359A8] bg-[#0359A8]" : "border-white/80 bg-white"}
            `}
          />
          {showPrices && marker.price ? (
            <span>{marker.price}</span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-[#0359A8]" />
          )}
        </div>
      </AdvancedMarker>

      {isSelected && (
        <InfoWindow
          position={{ lat: marker.lat, lng: marker.lng }}
          onCloseClick={() => onSelect(null)}
          pixelOffset={[0, -38]}
        >
          <div className="min-w-[200px] p-1">
            <p className="text-sm font-semibold text-neutral-900">
              {marker.title}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {marker.structureType}
            </p>
            {showPrices && marker.price && (
              <p className="mt-2 text-base font-semibold text-[#0359A8]">
                {marker.price}
                <span className="text-xs font-normal text-neutral-500">
                  {" "}
                  / día
                </span>
              </p>
            )}
            <a
              href={marker.href}
              className="mt-3 block w-full rounded-full bg-[#0359A8] px-4 py-2 text-center text-xs font-semibold text-white transition hover:bg-[#024a8c]"
            >
              Ver detalles
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function SearchMap({
  markers,
  center,
  showPrices,
  selectedId,
  onSelect,
}: SearchMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-100">
        <p className="text-sm text-neutral-500">
          Configura la API key de Google Maps
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={markers.length > 0 ? 12 : 10}
        mapId={GOOGLE_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        className="h-full w-full"
      >
        {markers.map((marker) => (
          <MarkerWithInfoWindow
            key={marker.id}
            marker={marker}
            showPrices={showPrices}
            isSelected={selectedId === marker.id}
            onSelect={onSelect}
          />
        ))}
      </Map>
    </APIProvider>
  );
}
