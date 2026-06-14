<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $o = (new Outlet)->getTable();

        $outletQuery = Outlet::query();
        $userQuery = User::query();
        $projectQuery = Project::query();
        $branchQuery = Branch::query();

        if ($user->role?->slug !== 'super_admin') {
            $companyId = $user->company_id;
            if ($user->role?->slug === 'field_collector') {
                $outletQuery->where($o.'.created_by', $user->id);
            } else {
                $outletQuery->where($o.'.company_id', $companyId);
            }
            $userQuery->where('users.company_id', $companyId);
            $projectQuery->where('company_id', $companyId);
            $branchQuery->where('company_id', $companyId);
        }

        if ($request->filled('branch_id')) {
            $branchId = (int) $request->query('branch_id');
            $outletQuery->where($o.'.branch_id', $branchId);
            $projectQuery->where('branch_id', $branchId);
        }

        $totalOutlets = (clone $outletQuery)->count();

        $byStatus = (clone $outletQuery)
            ->select($o.'.status', DB::raw('count(*) as c'))
            ->groupBy($o.'.status')
            ->pluck('c', 'status');

        $byType = (clone $outletQuery)
            ->select($o.'.outlet_type', DB::raw('count(*) as c'))
            ->groupBy($o.'.outlet_type')
            ->pluck('c', 'outlet_type');

        $countiesCovered = (int) (clone $outletQuery)
            ->whereNotNull($o.'.ward_id')
            ->join('wards', 'wards.id', '=', $o.'.ward_id')
            ->selectRaw('count(distinct wards.county_id) as aggregate')
            ->value('aggregate');

        if ($totalOutlets > 0 && $countiesCovered === 0) {
            $countiesCovered = 1;
        }

        $fieldCollectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        $fieldWorkers = $fieldCollectorRoleId
            ? (clone $userQuery)->where('role_id', $fieldCollectorRoleId)->count()
            : 0;

        $todayStart = now()->startOfDay();
        $submissionsToday = (clone $outletQuery)->where($o.'.created_at', '>=', $todayStart)->count();

        $pending = (int) ($byStatus['pending'] ?? 0);
        $approved = (int) ($byStatus['approved'] ?? 0);
        $denom = max(1, $pending + $approved);
        $dataQualityPct = (int) round(100 * $approved / $denom);

        $unregistered = (int) (clone $outletQuery)
            ->whereRaw('upper(coalesce('.$o.'.medical_facility_status, \'\')) like \'%UNREGISTER%\'')
            ->count();
        $registered = max(0, $totalOutlets - $unregistered);

        $medilabYes = (int) (clone $outletQuery)
            ->whereRaw('upper(coalesce('.$o.'.outlet_serviced_by_med, \'\')) in (\'YES\', \'Y\', \'1\')')
            ->count();
        $medilabNo = max(0, $totalOutlets - $medilabYes);

        $fieldWorkerRows = (clone $outletQuery)
            ->join('users', 'users.id', '=', $o.'.created_by')
            ->select('users.name', DB::raw('count('.$o.'.id) as outlet_count'))
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('outlet_count')
            ->limit(10)
            ->get();

        $workerTotal = max(1, $fieldWorkerRows->sum('outlet_count'));
        $fieldWorkerStats = $fieldWorkerRows->map(function ($row) use ($workerTotal): array {
            $c = (int) $row->outlet_count;

            return [
                'name' => (string) $row->name,
                'outlets' => $c,
                'pct' => round(100 * $c / $workerTotal, 2).'%',
            ];
        })->all();

        $trendStart = now()->subDays(13)->startOfDay();
        $driver = Outlet::query()->getConnection()->getDriverName();
        $dateExpr = $driver === 'pgsql'
            ? 'cast('.$o.'.created_at as date)'
            : 'date('.$o.'.created_at)';
        $trendRows = (clone $outletQuery)
            ->where($o.'.created_at', '>=', $trendStart)
            ->selectRaw($dateExpr.' as d, count(*) as c')
            ->groupByRaw($dateExpr)
            ->orderByRaw($dateExpr)
            ->get();

        $trends = $trendRows->map(function ($row): array {
            $d = $row->d;
            $dateLabel = is_string($d) ? $d : (string) $d;

            return [
                'date' => $dateLabel,
                'outlets' => (int) $row->c,
            ];
        })->all();

        $totalProjects = (clone $projectQuery)->count();
        $activeProjects = (clone $projectQuery)->where('status', 'active')->count();
        $totalBranches = (clone $branchQuery)->count();
        $pendingReviews = (int) ($byStatus['pending'] ?? 0);

        $submissionsByBranch = (clone $outletQuery)
            ->join('branches', 'branches.id', '=', $o.'.branch_id')
            ->selectRaw('branches.name as label, count(*) as count')
            ->groupBy('branches.name')
            ->pluck('count', 'label');

        return response()->json([
            'totalOutlets' => $totalOutlets,
            'totalProjects' => $totalProjects,
            'activeProjects' => $activeProjects,
            'totalBranches' => $totalBranches,
            'pendingReviews' => $pendingReviews,
            'submissionsByBranch' => $submissionsByBranch,
            'countiesCovered' => $countiesCovered,
            'fieldWorkers' => $fieldWorkers,
            'submissionsToday' => $submissionsToday,
            'dataQualityPct' => $dataQualityPct,
            'outletsByType' => $byType,
            'outletsByStatus' => $byStatus,
            'registeredOutlets' => $registered,
            'unregisteredOutlets' => $unregistered,
            'medilabYes' => $medilabYes,
            'medilabNo' => $medilabNo,
            'fieldWorkerStats' => $fieldWorkerStats,
            'submissionTrends' => $trends,
        ]);
    }
}
