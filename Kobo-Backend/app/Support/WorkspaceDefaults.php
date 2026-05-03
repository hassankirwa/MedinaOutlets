<?php

namespace App\Support;

final class WorkspaceDefaults
{
    /**
     * @return array<string, mixed>
     */
    public static function companySettings(): array
    {
        return [
            'users_roles' => [
                'super_admin_manage_config' => true,
                'data_manager_approve_reject' => true,
                'field_supervisor_review' => true,
                'viewer_reports_only' => true,
            ],
            'data_collection_rules' => [
                'require_phone_gps' => true,
                'duplicate_detect_radius_m' => 200,
                'validation_strictness' => 'standard',
                'min_photo_count' => 1,
            ],
            'workflow_approvals' => [
                'approval_mode' => 'manual_review',
                'sla_hours' => 48,
            ],
            'map_defaults' => [
                'center_lat' => -1.286389,
                'center_lng' => 36.817223,
                'zoom' => 11,
                'geofence_validation' => true,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $stored
     * @return array<string, mixed>
     */
    public static function mergeCompanySettings(?array $stored): array
    {
        return array_replace_recursive(self::companySettings(), $stored ?? []);
    }
}
