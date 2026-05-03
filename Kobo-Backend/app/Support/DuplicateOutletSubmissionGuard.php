<?php

namespace App\Support;

use App\Models\Company;
use App\Models\Outlet;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Business-rule duplicate detection: same company, similar facility name, within configured GPS radius.
 * Does not run for idempotent {@see Outlet::client_submission_key} retries (those short-circuit before create).
 */
final class DuplicateOutletSubmissionGuard
{
    private const MAX_RADIUS_M = 5000;

    public static function assertNotDuplicate(User $user, string $facilityName, float $latitude, float $longitude): void
    {
        if ($user->company_id === null) {
            return;
        }

        $merged = WorkspaceDefaults::mergeCompanySettings(
            Company::query()->find($user->company_id)?->settings,
        );
        $radius = (int) ($merged['data_collection_rules']['duplicate_detect_radius_m'] ?? 0);
        if ($radius <= 0) {
            return;
        }

        $radius = min(max($radius, 1), self::MAX_RADIUS_M);

        $table = (new Outlet)->getTable();
        $dLat = $radius / 111_000;
        $cosLat = cos(deg2rad($latitude));
        $dLng = $cosLat > 0.01 ? $radius / (111_000 * $cosLat) : $dLat;

        $candidates = Outlet::query()
            ->where($table.'.company_id', $user->company_id)
            ->whereBetween($table.'.latitude', [$latitude - $dLat, $latitude + $dLat])
            ->whereBetween($table.'.longitude', [$longitude - $dLng, $longitude + $dLng])
            ->get([$table.'.id', $table.'.facility_name', $table.'.latitude', $table.'.longitude']);

        $match = null;
        $bestDistance = INF;

        foreach ($candidates as $row) {
            $dist = self::haversineMeters(
                $latitude,
                $longitude,
                (float) $row->latitude,
                (float) $row->longitude,
            );
            if ($dist > $radius) {
                continue;
            }
            if (! self::facilityNamesMatch($facilityName, (string) $row->facility_name)) {
                continue;
            }
            if ($dist < $bestDistance) {
                $bestDistance = $dist;
                $match = $row;
            }
        }

        if ($match === null) {
            return;
        }

        $distRounded = (int) round($bestDistance);

        throw ValidationException::withMessages([
            'facility_name' => [
                __(
                    'A submission for a similar facility name already exists within :radius m of this location (about :dist m away, outlet #:id — ":existing"). Adjust the name or coordinates, or turn off duplicate detection in data collection rules.',
                    [
                        'radius' => $radius,
                        'dist' => $distRounded,
                        'id' => $match->id,
                        'existing' => $match->facility_name,
                    ],
                ),
            ],
        ]);
    }

    private static function normalizeFacilityName(string $name): string
    {
        $s = mb_strtolower(trim($name));
        $s = preg_replace('/\s+/u', ' ', $s) ?? $s;

        return $s;
    }

    private static function facilityNamesMatch(string $a, string $b): bool
    {
        $na = self::normalizeFacilityName($a);
        $nb = self::normalizeFacilityName($b);

        if ($na === $nb) {
            return true;
        }

        $lenA = mb_strlen($na);
        $lenB = mb_strlen($nb);
        if ($lenA < 3 || $lenB < 3) {
            return false;
        }

        similar_text($na, $nb, $pct);

        return $pct >= 88.0;
    }

    private static function haversineMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earth = 6_371_000.0;
        $φ1 = deg2rad($lat1);
        $φ2 = deg2rad($lat2);
        $Δφ = deg2rad($lat2 - $lat1);
        $Δλ = deg2rad($lon2 - $lon1);

        $a = sin($Δφ / 2) ** 2 + cos($φ1) * cos($φ2) * sin($Δλ / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earth * $c;
    }
}
