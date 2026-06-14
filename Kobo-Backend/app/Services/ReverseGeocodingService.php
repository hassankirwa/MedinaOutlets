<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ReverseGeocodingService
{
    private const CACHE_TTL_SECONDS = 86400;

    /**
     * @return array{
     *     captured_address: string|null,
     *     road: string|null,
     *     suburb: string|null,
     *     captured_ward: string|null,
     *     captured_county: string|null,
     *     region: string|null,
     *     country: string|null,
     *     reverse_geocoded_address: string|null,
     *     captured_place_name: string|null,
     *     landmark: string|null,
     * }
     */
    public function reverse(float $latitude, float $longitude): array
    {
        $cacheKey = sprintf(
            'geocode:reverse:v3:%s:%s',
            number_format($latitude, 5, '.', ''),
            number_format($longitude, 5, '.', ''),
        );

        /** @var array<string, string|null>|null $cached */
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $response = Http::withHeaders([
            'User-Agent' => config('app.name', 'KoboScrapper').'/1.0',
            'Accept' => 'application/json',
        ])
            ->timeout(10)
            ->get('https://nominatim.openstreetmap.org/reverse', [
                'lat' => $latitude,
                'lon' => $longitude,
                'format' => 'json',
                'addressdetails' => 1,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException(__('Reverse geocoding failed.'));
        }

        /** @var array<string, mixed> $payload */
        $payload = $response->json();
        $address = is_array($payload['address'] ?? null) ? $payload['address'] : [];

        $displayName = is_string($payload['display_name'] ?? null) ? trim($payload['display_name']) : null;
        if ($displayName === '') {
            $displayName = null;
        }

        $parsed = $this->parseKenyaDisplayName($displayName);

        $road = $this->firstString($address, ['road', 'pedestrian', 'footway', 'path']) ?? $parsed['road'];
        $suburb = $parsed['suburb'] ?? $this->firstString($address, [
            'city_district',
            'suburb',
            'neighbourhood',
            'quarter',
            'hamlet',
            'village',
        ]);
        $capturedWard = $this->firstString($address, ['ward']) ?? $parsed['captured_ward'];
        $country = $this->firstString($address, ['country']) ?? $parsed['country'];
        $region = $this->firstString($address, ['state', 'region', 'province']);

        $capturedCounty = $this->firstString($address, ['county', 'state_district']);
        if ($capturedCounty === null) {
            $capturedCounty = $parsed['captured_county'];
        }
        if ($capturedCounty === null) {
            $capturedCounty = $this->countyFromKenyaCity($address, $country);
        }

        $landmark = $this->extractLandmark($payload, $address, $parsed, $road, $suburb, $capturedWard, $capturedCounty, $country);

        $placeSummary = $this->buildLocationSummary($landmark, $road, $suburb, $capturedWard, $capturedCounty, $country);

        $result = [
            'captured_address' => $displayName,
            'road' => $road,
            'suburb' => $suburb,
            'captured_ward' => $capturedWard,
            'captured_county' => $capturedCounty,
            'region' => $region,
            'country' => $country,
            'reverse_geocoded_address' => $displayName,
            'captured_place_name' => $placeSummary,
            'landmark' => $landmark,
        ];

        Cache::put($cacheKey, $result, self::CACHE_TTL_SECONDS);

        return $result;
    }

    /**
     * @return array{
     *     landmark: string|null,
     *     road: string|null,
     *     suburb: string|null,
     *     captured_ward: string|null,
     *     captured_county: string|null,
     *     country: string|null,
     * }
     */
    public function parseKenyaDisplayName(?string $displayName): array
    {
        $empty = [
            'landmark' => null,
            'road' => null,
            'suburb' => null,
            'captured_ward' => null,
            'captured_county' => null,
            'country' => null,
        ];

        if ($displayName === null || trim($displayName) === '') {
            return $empty;
        }

        $parts = array_values(array_filter(
            array_map('trim', explode(',', $displayName)),
            fn (string $p) => $p !== '' && ! preg_match('/^\d{4,6}$/', $p),
        ));

        if ($parts === []) {
            return $empty;
        }

        $country = null;
        if (count($parts) >= 2 && $this->looksLikeCountry(end($parts))) {
            $country = array_pop($parts);
        }

        $landmark = null;
        $road = null;
        $ward = null;
        $division = null;
        $subcounty = null;
        $county = null;
        $cityNames = [];

        foreach ($parts as $index => $part) {
            if (preg_match('/\bcounty\b/i', $part)) {
                $county = $part;

                continue;
            }
            if (preg_match('/\bward\b/i', $part)) {
                $ward = $part;

                continue;
            }
            if (preg_match('/\bdivision\b/i', $part)) {
                $division = $part;

                continue;
            }
            if (preg_match('/\blocation\b/i', $part)) {
                continue;
            }
            if ($this->looksLikeRoad($part)) {
                if ($road === null) {
                    $road = $part;
                }

                continue;
            }
            if ($this->looksLikeKenyaCity($part)) {
                $cityNames[] = $part;

                continue;
            }
            if ($index === 0 && $landmark === null) {
                $landmark = $part;

                continue;
            }
            if ($division !== null && $subcounty === null) {
                $subcounty = $part;

                continue;
            }
            if ($ward !== null && $subcounty === null) {
                $subcounty = $part;

                continue;
            }
        }

        if ($county === null && $cityNames !== []) {
            $county = $this->normalizeKenyaCountyName($cityNames[0]);
        }

        $suburb = $division ?? $subcounty;

        return [
            'landmark' => $landmark,
            'road' => $road,
            'suburb' => $suburb,
            'captured_ward' => $ward,
            'captured_county' => $county,
            'country' => $country,
        ];
    }

    /**
     * @param  array<string, mixed>  $address
     */
    private function countyFromKenyaCity(array $address, ?string $country): ?string
    {
        if ($country !== null && strcasecmp($country, 'Kenya') !== 0) {
            return null;
        }

        $city = $this->firstString($address, ['city', 'town', 'municipality']);
        if ($city === null) {
            return null;
        }

        return $this->normalizeKenyaCountyName($city);
    }

    private function normalizeKenyaCountyName(string $name): string
    {
        $trimmed = trim($name);
        if ($trimmed === '') {
            return $trimmed;
        }
        if (preg_match('/\bcounty\b/i', $trimmed)) {
            return $trimmed;
        }

        return $trimmed.' County';
    }

    private function buildLocationSummary(
        ?string $landmark,
        ?string $road,
        ?string $suburb,
        ?string $ward,
        ?string $county,
        ?string $country,
    ): ?string {
        $parts = array_values(array_filter([$landmark, $road, $suburb, $ward, $county, $country]));

        return $parts === [] ? null : implode(', ', $parts);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $address
     * @param  array{landmark: string|null, road: string|null, suburb: string|null, captured_ward: string|null, captured_county: string|null, country: string|null}  $parsed
     */
    private function extractLandmark(
        array $payload,
        array $address,
        array $parsed,
        ?string $road,
        ?string $suburb,
        ?string $capturedWard,
        ?string $capturedCounty,
        ?string $country,
    ): ?string {
        if ($parsed['landmark'] !== null) {
            return $parsed['landmark'];
        }

        $exclude = array_filter([
            $capturedWard,
            $capturedCounty,
            $country,
            $suburb,
            $road,
        ]);

        $rootName = is_string($payload['name'] ?? null) ? trim($payload['name']) : null;
        if ($rootName !== null && $rootName !== '' && ! $this->matchesExcluded($rootName, $exclude)) {
            return $rootName;
        }

        $poi = $this->firstString($address, [
            'amenity',
            'office',
            'diplomatic',
            'shop',
            'building',
            'tourism',
            'historic',
            'leisure',
            'place',
        ]);
        if ($poi !== null) {
            return $poi;
        }

        return null;
    }

    private function looksLikeRoad(string $part): bool
    {
        return (bool) preg_match('/\b(Road|Street|Avenue|Highway|Lane|Drive|Way|Boulevard|Close|Crescent)\b/i', $part);
    }

    private function looksLikeKenyaCity(string $part): bool
    {
        return (bool) preg_match(
            '/^(Nairobi|Mombasa|Kisumu|Nakuru|Eldoret|Thika|Machakos|Kisii|Meru|Nyeri|Kitale|Malindi|Garissa)$/i',
            trim($part),
        );
    }

    private function looksLikeCountry(string $part): bool
    {
        return (bool) preg_match('/\b(Kenya|Uganda|Tanzania|Ethiopia|Somalia|Rwanda|Burundi|South Sudan)\b/i', $part);
    }

    /**
     * @param  list<string|null>  $exclude
     */
    private function matchesExcluded(string $value, array $exclude): bool
    {
        $normalized = strtolower(trim($value));
        foreach ($exclude as $item) {
            if ($item !== null && strtolower(trim($item)) === $normalized) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $address
     * @param  list<string>  $keys
     */
    private function firstString(array $address, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = $address[$key] ?? null;
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }
}
