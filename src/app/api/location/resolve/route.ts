import { NextRequest, NextResponse } from "next/server";
import { resolveKenyaCounty } from "@/lib/location";

export const dynamic = "force-dynamic";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodingResult = {
  address_components: GoogleAddressComponent[];
  formatted_address: string;
};

type GoogleGeocodingResponse = {
  results?: GoogleGeocodingResult[];
  status: string;
  error_message?: string;
};

const COUNTY_COMPONENT_PRIORITY = [
  "administrative_area_level_1",
  "administrative_area_level_2",
  "locality",
  "postal_town",
  "sublocality_level_1",
];

function getGoogleMapsApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GEOCODING_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  );
}

function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) {
    return null;
  }

  const coordinate = Number(value);

  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return null;
  }

  return coordinate;
}

function findCountyInGoogleResults(results: GoogleGeocodingResult[] = []) {
  for (const result of results) {
    for (const componentType of COUNTY_COMPONENT_PRIORITY) {
      const component = result.address_components.find((addressComponent) =>
        addressComponent.types.includes(componentType),
      );
      const county = resolveKenyaCounty(component?.long_name);

      if (county) {
        return {
          county,
          formattedAddress: result.formatted_address,
        };
      }
    }

    const county = resolveKenyaCounty(result.formatted_address);

    if (county) {
      return {
        county,
        formattedAddress: result.formatted_address,
      };
    }
  }

  return null;
}

function localCountyResponse(query: string | null) {
  const county = resolveKenyaCounty(query);

  if (!county) {
    return null;
  }

  return NextResponse.json({
    county,
    source: "local",
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query")?.trim() || null;
  const latitude = parseCoordinate(searchParams.get("lat"), -90, 90);
  const longitude = parseCoordinate(searchParams.get("lng"), -180, 180);
  const hasCoordinates = latitude !== null && longitude !== null;

  if (!query && !hasCoordinates) {
    return NextResponse.json(
      { error: "Enter a location or share your current location." },
      { status: 400 },
    );
  }

  if (query && query.length > 120) {
    return NextResponse.json(
      { error: "Location is too long." },
      { status: 400 },
    );
  }

  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    const localResponse = localCountyResponse(query);

    if (localResponse) {
      return localResponse;
    }

    return NextResponse.json(
      {
        error: "Location lookup is not configured. Choose an available county.",
      },
      { status: hasCoordinates ? 503 : 400 },
    );
  }

  const geocodeUrl = new URL(
    "https://maps.googleapis.com/maps/api/geocode/json",
  );

  if (hasCoordinates) {
    geocodeUrl.searchParams.set("latlng", `${latitude},${longitude}`);
  } else if (query) {
    geocodeUrl.searchParams.set("address", query);
    geocodeUrl.searchParams.set("components", "country:KE");
  }

  geocodeUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(geocodeUrl, { cache: "no-store" });

    if (!response.ok) {
      const localResponse = localCountyResponse(query);

      if (localResponse) {
        return localResponse;
      }

      return NextResponse.json(
        { error: "Location lookup failed." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as GoogleGeocodingResponse;

    if (data.status !== "OK") {
      const localResponse = localCountyResponse(query);

      if (localResponse) {
        return localResponse;
      }

      return NextResponse.json(
        {
          error:
            data.status === "ZERO_RESULTS"
              ? "No matching Kenya county found."
              : "Location lookup failed.",
        },
        { status: 404 },
      );
    }

    const resolvedLocation = findCountyInGoogleResults(data.results);

    if (!resolvedLocation) {
      const localResponse = localCountyResponse(query);

      if (localResponse) {
        return localResponse;
      }

      return NextResponse.json(
        { error: "No matching Kenya county found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...resolvedLocation,
      source: "google",
    });
  } catch (error) {
    console.error("Google location lookup failed:", error);

    const localResponse = localCountyResponse(query);

    if (localResponse) {
      return localResponse;
    }

    return NextResponse.json(
      { error: "Location lookup failed." },
      { status: 502 },
    );
  }
}
