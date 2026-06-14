<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class ProjectStatsService
{
    /**
     * @return Builder<\App\Models\Outlet>
     */
    public function scopedOutletQuery(User $user, ?int $projectId = null): Builder
    {
        $o = (new Outlet)->getTable();
        $query = Outlet::query();

        if ($user->role?->slug !== 'super_admin') {
            if ($user->role?->slug === 'field_collector') {
                $query->where($o.'.created_by', $user->id);
            } else {
                $query->where($o.'.company_id', $user->company_id);
            }
        }

        if ($projectId !== null) {
            $query->where($o.'.project_id', $projectId);
        }

        return $query;
    }

    /**
     * @return array{total: int, approved: int, pending: int, rejected: int, needs_correction: int, period_start: ?Carbon, period_end: ?Carbon, contributors: int}
     */
    public function projectOutletStats(User $user, Project $project): array
    {
        $o = (new Outlet)->getTable();
        $detailQuery = $this->scopedOutletQuery($user, $project->id);

        $total = (clone $detailQuery)->count();
        $approved = $total > 0 ? (clone $detailQuery)->where($o.'.status', 'approved')->count() : 0;
        $pending = $total > 0 ? (clone $detailQuery)->where($o.'.status', 'pending')->count() : 0;
        $rejected = $total > 0 ? (clone $detailQuery)->where($o.'.status', 'rejected')->count() : 0;
        $needsCorrection = $total > 0 ? (clone $detailQuery)->where($o.'.status', 'needs_correction')->count() : 0;

        $periodStart = $total > 0 ? (clone $detailQuery)->min($o.'.created_at') : null;
        $periodEnd = $total > 0 ? (clone $detailQuery)->max($o.'.created_at') : null;

        $contributors = $total > 0
            ? (clone $detailQuery)->distinct()->count($o.'.created_by')
            : 0;

        return [
            'total' => $total,
            'approved' => $approved,
            'pending' => $pending,
            'rejected' => $rejected,
            'needs_correction' => $needsCorrection,
            'period_start' => $periodStart ? Carbon::parse($periodStart) : null,
            'period_end' => $periodEnd ? Carbon::parse($periodEnd) : null,
            'contributors' => $contributors,
        ];
    }
}
