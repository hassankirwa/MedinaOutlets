<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OutletResource;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\ProjectFieldWorker;
use App\Models\Role;
use App\Models\User;
use App\Services\BranchCoverageValidator;
use App\Services\CollectorNotificationService;
use App\Services\ProjectStatsService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectWorkspaceController extends Controller
{
    public function __construct(
        private readonly ProjectStatsService $statsService,
        private readonly BranchCoverageValidator $coverageValidator,
    ) {}

    public function summary(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        /** @var User $user */
        $user = $request->user();
        $project->load(['branch', 'questionnaire', 'manager']);

        $stats = $this->statsService->projectOutletStats($user, $project);
        $fwCount = $project->projectFieldWorkers()->where('status', 'active')->distinct('field_worker_id')->count('field_worker_id');

        return response()->json([
            'summary' => [
                'total_submissions' => $stats['total'],
                'approved' => $stats['approved'],
                'pending_review' => $stats['pending'],
                'rejected' => $stats['rejected'],
                'needs_correction' => $stats['needs_correction'],
                'assigned_field_workers' => $fwCount,
            ],
            'header' => [
                'id' => (string) $project->id,
                'name' => $project->name,
                'status' => ucfirst($project->status),
                'branch' => $project->branch?->name,
                'branch_id' => $project->branch_id ? (string) $project->branch_id : null,
                'period_start' => $project->start_date?->toDateString(),
                'period_end' => $project->end_date?->toDateString(),
                'questionnaire' => $project->questionnaire?->name,
                'questionnaire_id' => $project->questionnaire_id ? (string) $project->questionnaire_id : null,
            ],
        ]);
    }

    public function analytics(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        /** @var User $user */
        $user = $request->user();
        $o = (new Outlet)->getTable();
        $base = $this->statsService->scopedOutletQuery($user, $project->id);

        $byDay = (clone $base)
            ->selectRaw('date('.$o.'.created_at) as day, count(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('count', 'day');

        $byWorker = (clone $base)
            ->join('users', 'users.id', '=', $o.'.created_by')
            ->selectRaw('users.name as label, count(*) as count')
            ->groupBy('users.name')
            ->orderByDesc('count')
            ->limit(20)
            ->pluck('count', 'label');

        $byCounty = (clone $base)
            ->selectRaw('COALESCE('.$o.'.captured_county, counties.name) as label, count(*) as count')
            ->leftJoin('counties', 'counties.id', '=', $o.'.county_id')
            ->whereNotNull(DB::raw('COALESCE('.$o.'.captured_county, counties.name)'))
            ->groupBy('label')
            ->pluck('count', 'label');

        $byWard = (clone $base)
            ->selectRaw('COALESCE('.$o.'.captured_ward, wards.name) as label, count(*) as count')
            ->leftJoin('wards', 'wards.id', '=', $o.'.ward_id')
            ->whereNotNull(DB::raw('COALESCE('.$o.'.captured_ward, wards.name)'))
            ->groupBy('label')
            ->pluck('count', 'label');

        $total = (clone $base)->count();
        $withGps = (clone $base)->whereNotNull($o.'.latitude')->whereNotNull($o.'.longitude')->count();
        $withPhotos = (clone $base)->whereNotNull($o.'.photos')->count();

        $stats = $this->statsService->projectOutletStats($user, $project);

        return response()->json([
            'submissions_by_day' => $byDay,
            'submissions_by_worker' => $byWorker,
            'submissions_by_county' => $byCounty,
            'submissions_by_ward' => $byWard,
            'approval_breakdown' => [
                'approved' => $stats['approved'],
                'pending' => $stats['pending'],
                'rejected' => $stats['rejected'],
                'needs_correction' => $stats['needs_correction'],
            ],
            'gps_completion_rate' => $total > 0 ? (int) round(100 * $withGps / $total) : 0,
            'photo_completion_rate' => $total > 0 ? (int) round(100 * $withPhotos / $total) : 0,
        ]);
    }

    public function getCoverage(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        $project->load(['branch', 'coverages.county', 'coverages.ward']);

        $coverage = $project->coverages
            ->groupBy('county_id')
            ->map(function ($items, $countyId) {
                $county = $items->first()?->county;

                return [
                    'county_id' => (int) $countyId,
                    'county_name' => $county?->name ?? '',
                    'wards' => $items->map(fn ($c) => [
                        'ward_id' => (int) $c->ward_id,
                        'ward_name' => $c->ward?->name ?? '',
                        'target_outlets' => $c->target_outlets,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'branch' => $project->branch ? [
                'id' => (string) $project->branch->id,
                'name' => $project->branch->name,
            ] : null,
            'coverage' => $coverage,
        ]);
    }

    public function syncCoverage(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        if ($project->status !== 'draft') {
            abort(422, 'Coverage can only be edited while project is in draft status.');
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'coverages' => 'required|array|min:1',
            'coverages.*.county_id' => 'required|integer|exists:counties,id',
            'coverages.*.ward_id' => 'required|integer|exists:wards,id',
            'coverages.*.target_outlets' => 'nullable|integer|min:0',
        ]);

        $project->update(['branch_id' => $validated['branch_id']]);
        $this->coverageValidator->validateAndSyncProjectCoverage(
            $project,
            (int) $validated['branch_id'],
            $validated['coverages'],
        );

        return $this->getCoverage($project);
    }

    public function fieldWorkers(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $rows = ProjectFieldWorker::query()
            ->where('project_id', $project->id)
            ->with(['fieldWorker', 'branch', 'county', 'ward'])
            ->get()
            ->map(function (ProjectFieldWorker $pfw): array {
                $submissions = Outlet::query()
                    ->where('project_id', $pfw->project_id)
                    ->where('created_by', $pfw->field_worker_id)
                    ->count();

                return [
                    'id' => (string) $pfw->id,
                    'name' => $pfw->fieldWorker?->name ?? '',
                    'phone' => $pfw->fieldWorker?->phone ?? '',
                    'branch' => $pfw->branch?->name ?? '',
                    'submissions' => $submissions,
                    'last_sync' => $pfw->fieldWorker?->updated_at?->toIso8601String(),
                    'status' => $pfw->status,
                ];
            });

        return response()->json(['field_workers' => $rows]);
    }

    public function syncFieldWorkers(Request $request, Project $project): JsonResponse
    {
        $this->authorize('assignWorkers', $project);

        $validated = $request->validate([
            'assignments' => 'required|array',
            'assignments.*.field_worker_id' => 'required|integer|exists:users,id',
            'assignments.*.branch_id' => 'required|integer|exists:branches,id',
            'assignments.*.county_id' => 'nullable|integer|exists:counties,id',
            'assignments.*.ward_id' => 'nullable|integer|exists:wards,id',
            'assignments.*.supervisor_id' => 'nullable|integer|exists:users,id',
            'assignments.*.status' => 'nullable|string|in:active,inactive',
        ]);

        $this->assertFieldCollectorsForCompany(
            array_column($validated['assignments'], 'field_worker_id'),
            $project->company_id,
        );

        $previousUserIds = ProjectFieldWorker::query()
            ->where('project_id', $project->id)
            ->pluck('field_worker_id')
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        $newUserIds = array_values(array_unique(array_map(
            fn (array $row): int => (int) $row['field_worker_id'],
            $validated['assignments'],
        )));

        DB::transaction(function () use ($project, $validated): void {
            ProjectFieldWorker::query()->where('project_id', $project->id)->delete();
            foreach ($validated['assignments'] as $row) {
                ProjectFieldWorker::query()->create([
                    'project_id' => $project->id,
                    'field_worker_id' => (int) $row['field_worker_id'],
                    'branch_id' => (int) $row['branch_id'],
                    'county_id' => $row['county_id'] ?? null,
                    'ward_id' => $row['ward_id'] ?? null,
                    'supervisor_id' => $row['supervisor_id'] ?? null,
                    'status' => $row['status'] ?? 'active',
                ]);
            }
        });

        app(CollectorNotificationService::class)->notifyNewlyAssignedCollectors(
            $project,
            $previousUserIds,
            $newUserIds,
        );

        return $this->fieldWorkers($project);
    }

    public function publish(Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        if ($project->branch_id === null) {
            abort(422, 'Assign a branch before publishing.');
        }
        if ($project->questionnaire_id === null) {
            abort(422, 'Attach a questionnaire before publishing.');
        }

        $project->update([
            'status' => 'active',
            'published_at' => now(),
        ]);

        return response()->json(['project' => ['id' => (string) $project->id, 'status' => 'Active']]);
    }

    public function outlets(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        /** @var User $user */
        $user = $request->user();
        $t = (new Outlet)->getTable();

        $query = Outlet::query()
            ->with(['creator', 'ward', 'branch', 'county', 'project'])
            ->where($t.'.project_id', $project->id);

        if ($user->role?->slug !== 'super_admin') {
            $query->where($t.'.company_id', $user->company_id);
        }

        foreach (['status', 'branch_id', 'county_id', 'ward_id', 'created_by'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($t.'.'.$filter, $request->input($filter));
            }
        }

        if ($request->filled('captured_county')) {
            $query->where($t.'.captured_county', 'like', '%'.$request->string('captured_county').'%');
        }

        if ($request->filled('captured_ward')) {
            $query->where($t.'.captured_ward', 'like', '%'.$request->string('captured_ward').'%');
        }

        if ($request->filled('search')) {
            $s = '%'.$request->string('search').'%';
            $query->where(function (Builder $q) use ($s, $t): void {
                $q->where($t.'.facility_name', 'like', $s)
                    ->orWhere($t.'.owner_name', 'like', $s)
                    ->orWhere($t.'.business_phone', 'like', $s);
            });
        }

        if ($request->filled('from')) {
            $query->whereDate($t.'.created_at', '>=', $request->date('from')->format('Y-m-d'));
        }
        if ($request->filled('to')) {
            $query->whereDate($t.'.created_at', '<=', $request->date('to')->format('Y-m-d'));
        }

        if ($request->boolean('has_gps')) {
            $query->whereNotNull($t.'.latitude')->whereNotNull($t.'.longitude');
        }
        if ($request->boolean('has_photos')) {
            $query->whereNotNull($t.'.photos');
        }

        $outlets = $query->orderByDesc('created_at')->limit(500)->get();

        return OutletResource::collection($outlets)->response();
    }

    /**
     * @param  array<int>  $userIds
     */
    private function assertFieldCollectorsForCompany(array $userIds, int $companyId): void
    {
        $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
        if ($userIds === []) {
            return;
        }

        $collectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        if (! $collectorRoleId) {
            abort(422, 'Field collector role is not configured.');
        }

        $validCount = User::query()
            ->whereIn('id', $userIds)
            ->where('company_id', $companyId)
            ->where('role_id', $collectorRoleId)
            ->count();

        if ($validCount !== count($userIds)) {
            abort(422, 'Each assigned user must be a field collector in this workspace.');
        }
    }
}
