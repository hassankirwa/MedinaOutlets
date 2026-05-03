<?php

namespace App\Http\Resources;

use App\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin Outlet */
class OutletResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $o = $this->resource;
        $creator = $o->relationLoaded('creator') ? $o->creator : $o->creator()->first();

        return [
            'id' => (string) $o->id,
            'name' => $o->facility_name,
            'type' => $o->outlet_type,
            'owner' => $o->owner_name,
            'phone' => $o->business_phone ?? '',
            'location' => $this->locationLabel($o),
            'fieldWorker' => $creator?->name ?? '',
            'accountStatus' => $this->accountStatusLabel($o),
            'servicedByMedilab' => $this->servicedLabel($o),
            'submittedAt' => $o->created_at?->format('M j, Y g:i A') ?? '',
            'lat' => (float) $o->latitude,
            'lng' => (float) $o->longitude,
            'status' => $o->status,
            'ward_id' => $o->ward_id,
            /** ISO8601 for mobile / programmatic sorting (submittedAt stays human-readable). */
            'submitted_at' => $o->created_at?->toIso8601String(),
            'photo_urls' => $this->photoUrls($request, $o),
            'raw' => [
                'facility_name' => $o->facility_name,
                'outlet_type' => $o->outlet_type,
                'type_of_account' => $o->type_of_account,
                'medical_facility_status' => $o->medical_facility_status,
                'outlet_serviced_by_med' => $o->outlet_serviced_by_med,
                'selected_category' => $o->selected_category,
                'physical_location' => $o->physical_location,
                'landmark' => $o->landmark,
                'remarks' => $o->remarks,
                'email' => $o->email,
            ],
        ];
    }

    private function locationLabel(Outlet $o): string
    {
        $parts = array_filter([$o->physical_location, $o->landmark]);

        return implode(' · ', $parts) ?: $o->physical_location;
    }

    private function accountStatusLabel(Outlet $o): string
    {
        $s = strtoupper((string) $o->medical_facility_status);

        return str_contains($s, 'UNREGISTER') ? 'Unregistered' : 'Registered';
    }

    private function servicedLabel(Outlet $o): string
    {
        $s = strtoupper((string) $o->outlet_serviced_by_med);

        return ($s === 'NO' || $s === 'N') ? 'No' : 'Yes';
    }

    /**
     * Field collectors receive authenticated API routes for disk photos (see OutletController::photo).
     * Staff roles continue to receive direct storage URLs for admin portals.
     *
     * @return list<string>
     */
    private function photoUrls(Request $request, Outlet $o): array
    {
        $request->user()?->loadMissing('role');

        if ($request->user()?->role?->slug === 'field_collector') {
            return $this->photoUrlsForFieldCollector($o);
        }

        $photos = $o->photos;
        $urls = [];

        if (is_array($photos) && $photos !== []) {
            foreach ($photos as $item) {
                $url = $this->resolvePhotoItem($item);
                if ($url !== null) {
                    $urls[] = $url;
                }
            }
        }

        if ($urls !== []) {
            return array_values($urls);
        }

        if ($this->shouldUseDummyPhotos()) {
            return $this->dummyPhotoUrls($o);
        }

        return [];
    }

    /**
     * @return list<string>
     */
    private function photoUrlsForFieldCollector(Outlet $o): array
    {
        $paths = $o->listPhotoPublicDiskPaths();
        if ($paths !== []) {
            $urls = [];
            foreach (array_keys($paths) as $i) {
                // Relative — mobile prepends API origin (`extra.apiUrl` / LAN IP).
                $urls[] = '/api/outlets/'.$o->id.'/photos/'.$i;
            }

            return $urls;
        }

        if ($this->shouldUseDummyPhotos()) {
            return $this->dummyPhotoUrls($o);
        }

        return [];
    }

    private function shouldUseDummyPhotos(): bool
    {
        if (config('app.dummy_submission_images', false)) {
            return true;
        }

        return app()->environment('local');
    }

    /**
     * @return list<string>
     */
    private function dummyPhotoUrls(Outlet $o): array
    {
        $id = (int) $o->id;

        return [
            'https://picsum.photos/seed/outlet'.$id.'a/960/720',
            'https://picsum.photos/seed/outlet'.$id.'b/960/720',
            'https://picsum.photos/seed/outlet'.$id.'c/960/720',
        ];
    }

    private function resolvePhotoItem(mixed $item): ?string
    {
        if (is_string($item)) {
            if (str_starts_with($item, 'http://') || str_starts_with($item, 'https://')) {
                return $item;
            }

            return Storage::disk('public')->exists($item)
                ? Storage::disk('public')->url($item)
                : null;
        }

        if (! is_array($item)) {
            return null;
        }

        $uri = $item['uri'] ?? null;
        if (is_string($uri) && (str_starts_with($uri, 'http://') || str_starts_with($uri, 'https://'))) {
            return $uri;
        }

        foreach (['path', 'storage_path', 'disk_path'] as $key) {
            $path = $item[$key] ?? null;
            if (is_string($path) && $path !== '') {
                return Storage::disk('public')->exists($path)
                    ? Storage::disk('public')->url($path)
                    : null;
            }
        }

        return null;
    }
}
