<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\ProjectWardAssignment;
use App\Models\Role;
use App\Models\User;
use App\Models\Ward;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class ProjectController extends Controller
{
    /**
     * @return Builder<\App\Models\Outlet>
     */
    private function scopedOutletQuery(User $user): Builder
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

        return $query;
    }

    /**
     * @return array{total: int, approved: int, progress: int, period_start: ?Carbon, period_end: ?Carbon, contributors: int}
     */
    private function countyOutletStats(User $user, int $countyId): array
    {
        $o = (new Outlet)->getTable();
        $w = (new Ward)->getTable();

        $detailQuery = $this->scopedOutletQuery($user)
            ->whereNotNull($o.'.ward_id')
            ->join($w, $w.'.id', '=', $o.'.ward_id')
            ->where($w.'.county_id', $countyId);

        $total = (clone $detailQuery)->count();
        $approved = $total > 0 ? (clone $detailQuery)->where($o.'.status', 'approved')->count() : 0;
        $progress = $total > 0 ? (int) round(100 * $approved / max(1, $total)) : 0;

        $periodStart = $total > 0 ? (clone $detailQuery)->min($o.'.created_at') : null;
        $periodEnd = $total > 0 ? (clone $detailQuery)->max($o.'.created_at') : null;

        $contributors = $total > 0
            ? (clone $detailQuery)->distinct()->count($o.'.created_by')
            : 0;

        return [
            'total' => $total,
            'approved' => $approved,
            'progress' => $progress,
            'period_start' => $periodStart ? Carbon::parse($periodStart) : null,
            'period_end' => $periodEnd ? Carbon::parse($periodEnd) : null,
            'contributors' => $contributors,
        ];
    }

    private function labelStatus(string $raw): string
    {
        return match ($raw) {
            'draft' => 'Draft',
            'active' => 'Active',
            'paused' => 'Paused',
            'completed' => 'Completed',
            default => 'Draft',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function projectToSummaryArray(Project $project, User $user): array
    {
        $stats = $this->countyOutletStats($user, (int) $project->county_id);

        $start = $project->start_date?->clone()->startOfDay()
            ?? $stats['period_start'];
        $end = $project->end_date?->clone()->endOfDay()
            ?? $stats['period_end'];

        if ($start === null && $end === null) {
            $start = Carbon::now()->startOfDay();
            $end = Carbon::now()->endOfDay();
        } elseif ($start === null) {
            $start = $end !== null ? $end->clone()->startOfDay() : Carbon::now()->startOfDay();
        } elseif ($end === null) {
            $end = $start->clone()->endOfDay();
        }

        $wardUserCount = $project->relationLoaded('wardAssignments')
            ? $project->wardAssignments->pluck('user_id')->unique()->count()
            : $project->wardAssignments()->get()->pluck('user_id')->unique()->count();
        $pivotCount = $project->relationLoaded('assignedWorkers')
            ? $project->assignedWorkers->count()
            : $project->assignedWorkers()->count();

        return [
            'id' => (string) $project->id,
            'county_id' => (int) $project->county_id,
            'name' => $project->name,
            'county' => $project->county->name,
            'status' => $this->labelStatus($project->status),
            'period_start' => $start->toIso8601String(),
            'period_end' => $end->toIso8601String(),
            'outlets_collected' => $stats['total'],
            'field_workers' => $wardUserCount > 0 ? $wardUserCount : $pivotCount,
            'progress' => $stats['progress'],
            'description' => $project->description,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $query = Project::query()->with(['county', 'assignedWorkers', 'wardAssignments']);

        if ($user->role?->slug === 'super_admin') {
            if ($request->filled('company_id')) {
                $query->where('company_id', (int) $request->query('company_id'));
            }
        } elseif ($user->role?->slug === 'field_collector') {
            $query->where(function (Builder $q) use ($user): void {
                $q->whereHas(
                    'wardAssignments',
                    fn (Builder $w) => $w->where('user_id', $user->id),
                )->orWhereHas(
                    'assignedWorkers',
                    fn (Builder $u) => $u->where('users.id', $user->id),
                );
            });
        } else {
            $query->where('company_id', $user->company_id);
        }

        $rows = $query->orderBy('name')->get()->map(
            fn (Project $p) => $this->projectToSummaryArray($p, $user),
        );

        $statusCounts = $rows->groupBy('status')->map->count();

        $collectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        $totalFw = 0;
        if ($collectorRoleId) {
            $uq = User::query()->where('role_id', $collectorRoleId);
            if ($user->role?->slug !== 'super_admin') {
                $uq->where('company_id', $user->company_id);
            } elseif ($request->filled('company_id')) {
                $uq->where('company_id', (int) $request->query('company_id'));
            }
            $totalFw = $uq->count();
        }

        return response()->json([
            'summary' => [
                'total_projects' => $rows->count(),
                'active_projects' => (int) ($statusCounts['Active'] ?? 0),
                'completed_projects' => (int) ($statusCounts['Completed'] ?? 0),
                'paused_projects' => (int) ($statusCounts['Paused'] ?? 0),
                'draft_projects' => (int) ($statusCounts['Draft'] ?? 0),
                'total_field_workers' => $totalFw,
            ],
            'projects' => $rows->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'county_id' => 'required|exists:counties,id',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'required|string|in:draft,active,paused,completed',
            'field_worker_ids' => 'nullable|array',
            'field_worker_ids.*' => 'integer|exists:users,id',
            'ward_assignments' => 'nullable|array',
            'ward_assignments.*.ward_id' => 'required|integer|exists:wards,id',
            'ward_assignments.*.user_id' => 'required|integer|exists:users,id',
            'company_id' => 'nullable|exists:companies,id',
        ]);

        $companyId = $user->role?->slug === 'super_admin'
            ? ($validated['company_id'] ?? $user->company_id)
            : $user->company_id;

        if ($companyId === null) {
            abort(response()->json(['message' => 'company_id is required when your account is not linked to an organization.'], 422));
        }

        $this->assertFieldCollectorsForCompany($validated['field_worker_ids'] ?? [], $companyId);

        $project = Project::query()->create([
            'company_id' => $companyId,
            'county_id' => $validated['county_id'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'created_by' => $user->id,
        ]);

        $project->load(['county', 'assignedWorkers']);

        if (array_key_exists('ward_assignments', $validated)) {
            $this->replaceWardAssignments($project, $validated['ward_assignments'] ?? [], $user);
        } else {
            $syncData = [];
            foreach ($validated['field_worker_ids'] ?? [] as $uid) {
                $syncData[(int) $uid] = [
                    'assigned_at' => now(),
                    'assigned_by' => $user->id,
                ];
            }
            if ($syncData !== []) {
                $project->assignedWorkers()->sync($syncData);
            }
        }

        $project->load(['assignedWorkers', 'wardAssignments']);

        return response()->json([
            'project' => $this->projectToSummaryArray($project, $user),
        ], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $project->load(['county', 'assignedWorkers', 'wardAssignments.user', 'wardAssignments.ward']);
        $project->county->load(['wards' => fn ($q) => $q->orderBy('name')]);

        $stats = $this->countyOutletStats($user, (int) $project->county_id);

        $start = $project->start_date?->clone()->startOfDay()
            ?? $stats['period_start'];
        $end = $project->end_date?->clone()->endOfDay()
            ?? $stats['period_end'];

        if ($start === null && $end === null) {
            $start = Carbon::now()->startOfDay();
            $end = Carbon::now()->endOfDay();
        } elseif ($start === null) {
            $start = $end !== null ? $end->clone()->startOfDay() : Carbon::now()->startOfDay();
        } elseif ($end === null) {
            $end = $start->clone()->endOfDay();
        }

        $assignByWard = $project->wardAssignments->keyBy('ward_id');
        $wardsPayload = $project->county->wards->map(function (Ward $w) use ($assignByWard): array {
            $a = $assignByWard->get($w->id);

            return [
                'id' => $w->id,
                'name' => $w->name,
                'assigned_user_id' => $a ? (int) $a->user_id : null,
                'assigned_user_name' => $a?->user?->name,
            ];
        })->values()->all();

        $wardUserCount = $project->wardAssignments->pluck('user_id')->unique()->count();

        return response()->json([
            'project' => [
                'id' => (string) $project->id,
                'county_id' => $project->county_id,
                'name' => $project->name,
                'description' => $project->description,
                'county' => $project->county->name,
                'status' => $this->labelStatus($project->status),
                'period_start' => $start->toIso8601String(),
                'period_end' => $end->toIso8601String(),
                'outlets_collected' => $stats['total'],
                'progress' => $stats['progress'],
                'field_workers' => $wardUserCount > 0 ? $wardUserCount : $project->assignedWorkers->count(),
                'start_date' => $project->start_date?->toDateString(),
                'end_date' => $project->end_date?->toDateString(),
            ],
            'assigned_workers' => $project->assignedWorkers->map(fn (User $u): array => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])->values()->all(),
            'wards' => $wardsPayload,
            'stats' => [
                'outlet_contributors' => $stats['contributors'],
            ],
        ]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'county_id' => 'sometimes|exists:counties,id',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => 'sometimes|string|in:draft,active,paused,completed',
            'field_worker_ids' => 'nullable|array',
            'field_worker_ids.*' => 'integer|exists:users,id',
            'ward_assignments' => 'nullable|array',
            'ward_assignments.*.ward_id' => 'required|integer|exists:wards,id',
            'ward_assignments.*.user_id' => 'required|integer|exists:users,id',
        ]);

        $this->assertFieldCollectorsForCompany($validated['field_worker_ids'] ?? [], $project->company_id);

        $fill = collect($validated)->except(['field_worker_ids', 'ward_assignments'])->all();
        if ($fill !== []) {
            $project->fill($fill);
            $project->save();
        }

        if (array_key_exists('ward_assignments', $validated)) {
            $this->replaceWardAssignments($project, $validated['ward_assignments'] ?? [], $user);
        } elseif (array_key_exists('field_worker_ids', $validated)) {
            $syncData = [];
            foreach ($validated['field_worker_ids'] ?? [] as $uid) {
                $syncData[(int) $uid] = [
                    'assigned_at' => now(),
                    'assigned_by' => $user->id,
                ];
            }
            $project->assignedWorkers()->sync($syncData);
        }

        $project->load(['county', 'assignedWorkers', 'wardAssignments']);

        return response()->json([
            'project' => $this->projectToSummaryArray($project, $user),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);
        $project->delete();

        return response()->json(['ok' => true]);
    }

    public function syncAssignments(Request $request, Project $project): JsonResponse
    {
        $this->authorize('assignWorkers', $project);

        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        $this->assertFieldCollectorsForCompany($validated['user_ids'], $project->company_id);

        $syncData = [];
        foreach ($validated['user_ids'] as $uid) {
            $syncData[(int) $uid] = [
                'assigned_at' => now(),
                'assigned_by' => $user->id,
            ];
        }
        $project->assignedWorkers()->sync($syncData);

        $project->load(['county', 'assignedWorkers']);

        return response()->json([
            'assigned_workers' => $project->assignedWorkers->map(fn (User $u): array => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])->values()->all(),
        ]);
    }

    public function syncWardAssignments(Request $request, Project $project): JsonResponse
    {
        $this->authorize('assignWards', $project);

        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'assignments' => 'required|array',
            'assignments.*.ward_id' => 'required|integer|exists:wards,id',
            'assignments.*.user_id' => 'required|integer|exists:users,id',
        ]);

        $this->replaceWardAssignments($project, $validated['assignments'], $user);

        $project->refresh();
        $project->load([
            'county.wards' => fn ($q) => $q->orderBy('name'),
            'wardAssignments.user',
            'assignedWorkers',
        ]);

        $assignByWard = $project->wardAssignments->keyBy('ward_id');
        $wardsPayload = $project->county->wards->map(function (Ward $w) use ($assignByWard): array {
            $a = $assignByWard->get($w->id);

            return [
                'id' => $w->id,
                'name' => $w->name,
                'assigned_user_id' => $a ? (int) $a->user_id : null,
                'assigned_user_name' => $a?->user?->name,
            ];
        })->values()->all();

        return response()->json([
            'wards' => $wardsPayload,
            'assigned_workers' => $project->assignedWorkers->map(fn (User $u): array => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])->values()->all(),
        ]);
    }

    public function myAssignments(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        if ($user->role?->slug !== 'field_collector') {
            return response()->json(['projects' => []]);
        }

        $q = Project::query()
            ->with(['county'])
            ->whereIn('status', ['draft', 'active', 'paused', 'completed'])
            ->where(function (Builder $scope) use ($user): void {
                $scope->whereHas(
                    'wardAssignments',
                    fn (Builder $w) => $w->where('user_id', $user->id),
                )->orWhereHas(
                    'assignedWorkers',
                    fn (Builder $rel) => $rel->whereKey($user->id),
                );
            });

        if ($user->company_id !== null) {
            $q->where('company_id', $user->company_id);
        }

        $projects = $q->orderBy('name')->get()->map(function (Project $p) use ($user): array {
            $wards = ProjectWardAssignment::query()
                ->where('project_id', $p->id)
                ->where('user_id', $user->id)
                ->with('ward')
                ->orderBy('ward_id')
                ->get()
                ->map(fn (ProjectWardAssignment $a): array => [
                    'id' => $a->ward_id,
                    'name' => $a->ward?->name ?? '',
                ])->values()->all();

            return [
                'id' => (string) $p->id,
                'name' => $p->name,
                'county' => $p->county?->name ?? '',
                'status' => $p->status,
                'wards' => $wards,
            ];
        });

        return response()->json(['projects' => $projects]);
    }

    /**
     * @param  array<int|null>  $userIds
     */
    private function assertFieldCollectorsForCompany(array $userIds, int $companyId): void
    {
        $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
        if ($userIds === []) {
            return;
        }

        $collectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        if (! $collectorRoleId) {
            abort(response()->json(['message' => 'Field collector role is not configured.'], 422));
        }

        $validCount = User::query()
            ->whereIn('id', $userIds)
            ->where('company_id', $companyId)
            ->where('role_id', $collectorRoleId)
            ->count();

        if ($validCount !== count($userIds)) {
            abort(response()->json([
                'message' => 'Each assigned user must be an active field collector in this workspace.',
            ], 422));
        }
    }

    /**
     * @param  array<int, array{ward_id: int, user_id: int}>  $rows
     */
    private function replaceWardAssignments(Project $project, array $rows, User $actor): void
    {
        $countyId = (int) $project->county_id;
        $companyId = (int) $project->company_id;

        $validWardIds = Ward::query()->where('county_id', $countyId)->pluck('id')->all();
        $validWardSet = array_flip($validWardIds);

        foreach ($rows as $row) {
            $wid = (int) $row['ward_id'];
            if (! isset($validWardSet[$wid])) {
                abort(response()->json([
                    'message' => 'Each ward must belong to the project county.',
                ], 422));
            }
        }

        $userIds = array_values(array_unique(array_map(fn (array $r): int => (int) $r['user_id'], $rows)));
        $this->assertFieldCollectorsForCompany($userIds, $companyId);

        DB::transaction(function () use ($project, $rows, $actor): void {
            ProjectWardAssignment::query()->where('project_id', $project->id)->delete();
            $now = now();
            foreach ($rows as $row) {
                ProjectWardAssignment::query()->create([
                    'project_id' => $project->id,
                    'ward_id' => (int) $row['ward_id'],
                    'user_id' => (int) $row['user_id'],
                    'assigned_at' => $now,
                    'assigned_by' => $actor->id,
                ]);
            }
            $this->syncProjectUsersFromWardAssignments($project, $actor);
        });

        $project->unsetRelation('wardAssignments');
        $project->unsetRelation('assignedWorkers');
        $project->load(['wardAssignments', 'assignedWorkers']);
    }

    private function syncProjectUsersFromWardAssignments(Project $project, User $actor): void
    {
        $uids = ProjectWardAssignment::query()
            ->where('project_id', $project->id)
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        $syncData = [];
        foreach ($uids as $uid) {
            $syncData[(int) $uid] = [
                'assigned_at' => now(),
                'assigned_by' => $actor->id,
            ];
        }
        $project->assignedWorkers()->sync($syncData);
    }
}
