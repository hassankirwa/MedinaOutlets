<?php

namespace Tests\Unit;

use App\Services\ReverseGeocodingService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReverseGeocodingServiceTest extends TestCase
{
    private ReverseGeocodingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ReverseGeocodingService;
        Cache::flush();
    }

    public function test_parse_kenya_display_name_extracts_ward_area_county_country(): void
    {
        $parsed = $this->service->parseKenyaDisplayName('Mautuma ward, Lugari, Kakamega County, Kenya');

        $this->assertSame('Lugari', $parsed['suburb']);
        $this->assertSame('Mautuma ward', $parsed['captured_ward']);
        $this->assertSame('Kakamega County', $parsed['captured_county']);
        $this->assertSame('Kenya', $parsed['country']);
    }

    public function test_parse_nairobi_display_name_extracts_landmark_ward_area_county(): void
    {
        $parsed = $this->service->parseKenyaDisplayName(
            'South Africa High Commission, Lenana Road, Kilimani location, Kilimani ward, Kilimani division, Westlands, Nairobi, Zimmerman, Nairobi, 29526, Kenya',
        );

        $this->assertSame('South Africa High Commission', $parsed['landmark']);
        $this->assertSame('Lenana Road', $parsed['road']);
        $this->assertSame('Kilimani division', $parsed['suburb']);
        $this->assertSame('Kilimani ward', $parsed['captured_ward']);
        $this->assertSame('Nairobi County', $parsed['captured_county']);
        $this->assertSame('Kenya', $parsed['country']);
    }

    public function test_reverse_applies_display_name_fallback_when_address_keys_missing(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/*' => Http::response([
                'display_name' => 'Mautuma ward, Lugari, Kakamega County, Kenya',
                'address' => [
                    'country' => 'Kenya',
                ],
            ]),
        ]);

        $result = $this->service->reverse(0.5, 34.8);

        $this->assertSame('Mautuma ward', $result['captured_ward']);
        $this->assertSame('Lugari', $result['suburb']);
        $this->assertSame('Kakamega County', $result['captured_county']);
        $this->assertSame('Kenya', $result['country']);
    }

    public function test_reverse_nairobi_urban_address(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/*' => Http::response([
                'display_name' => 'South Africa High Commission, Lenana Road, Kilimani location, Kilimani ward, Kilimani division, Westlands, Nairobi, Kenya',
                'name' => 'South Africa High Commission',
                'address' => [
                    'road' => 'Lenana Road',
                    'city_district' => 'Westlands',
                    'suburb' => 'Kilimani',
                    'city' => 'Nairobi',
                    'country' => 'Kenya',
                ],
            ]),
        ]);

        $result = $this->service->reverse(-1.29, 36.79);

        $this->assertSame('South Africa High Commission', $result['landmark']);
        $this->assertSame('Lenana Road', $result['road']);
        $this->assertSame('Kilimani ward', $result['captured_ward']);
        $this->assertSame('Nairobi County', $result['captured_county']);
        $this->assertStringContainsString('South Africa High Commission', $result['captured_place_name'] ?? '');
        $this->assertStringContainsString('Nairobi County', $result['captured_place_name'] ?? '');
    }

    public function test_reverse_extracts_landmark_from_name(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/*' => Http::response([
                'display_name' => 'Goodwill Chemist, Mogondo highway, Nairobi, Kenya',
                'name' => 'Goodwill Chemist',
                'address' => [
                    'road' => 'Mogondo highway',
                    'city' => 'Nairobi',
                    'country' => 'Kenya',
                ],
            ]),
        ]);

        $result = $this->service->reverse(-1.28, 36.82);

        $this->assertSame('Goodwill Chemist', $result['landmark']);
        $this->assertSame('Nairobi County', $result['captured_county']);
    }

    public function test_reverse_extracts_landmark_from_amenity_when_name_absent(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/*' => Http::response([
                'display_name' => 'Market, Lugari, Kakamega County, Kenya',
                'address' => [
                    'amenity' => 'Market',
                    'city' => 'Lugari',
                    'county' => 'Kakamega County',
                    'country' => 'Kenya',
                ],
            ]),
        ]);

        $result = $this->service->reverse(0.5, 34.8);

        $this->assertSame('Market', $result['landmark']);
    }
}
