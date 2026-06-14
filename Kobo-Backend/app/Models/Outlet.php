<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Outlet extends Model
{
    protected $fillable = [
        'company_id',
        'project_id',
        'branch_id',
        'county_id',
        'questionnaire_id',
        'created_by',
        'client_submission_key',
        'ward_id',
        'facility_name',
        'outlet_type',
        'owner_name',
        'business_phone',
        'alternative_phone',
        'email',
        'physical_location',
        'landmark',
        'latitude',
        'longitude',
        'gps_accuracy_meters',
        'captured_place_name',
        'reverse_geocoded_address',
        'captured_address',
        'road',
        'suburb',
        'captured_ward',
        'captured_county',
        'region',
        'country',
        'type_of_account',
        'medical_facility_status',
        'outlet_serviced_by_med',
        'selected_category',
        'remarks',
        'photos',
        'status',
        'sla_notified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'photos' => 'array',
            'sla_notified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<Branch, $this>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * @return BelongsTo<County, $this>
     */
    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    /**
     * @return BelongsTo<Questionnaire, $this>
     */
    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(Questionnaire::class);
    }

    /**
     * @return BelongsTo<Ward, $this>
     */
    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    /**
     * @return HasMany<SubmissionAnswer, $this>
     */
    public function answers(): HasMany
    {
        return $this->hasMany(SubmissionAnswer::class);
    }

    /**
     * Paths on the `public` disk for stored photos, in display order (files must exist).
     *
     * @return list<string>
     */
    public function listPhotoPublicDiskPaths(): array
    {
        $photos = $this->photos;
        if (! is_array($photos) || $photos === []) {
            return [];
        }

        $paths = [];
        foreach ($photos as $item) {
            $path = self::extractPublicDiskPathFromPhotoPayload($item);
            if ($path !== null && Storage::disk('public')->exists($path)) {
                $paths[] = $path;
            }
        }

        return array_values($paths);
    }

    private static function extractPublicDiskPathFromPhotoPayload(mixed $item): ?string
    {
        if (is_string($item)) {
            if (str_starts_with($item, 'http://') || str_starts_with($item, 'https://')) {
                return null;
            }

            return $item !== '' ? $item : null;
        }

        if (! is_array($item)) {
            return null;
        }

        $uri = $item['uri'] ?? null;
        if (is_string($uri) && (str_starts_with($uri, 'http://') || str_starts_with($uri, 'https://'))) {
            return null;
        }

        foreach (['path', 'storage_path', 'disk_path'] as $key) {
            $path = $item[$key] ?? null;
            if (is_string($path) && $path !== '') {
                return $path;
            }
        }

        return null;
    }
}
