<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\County;
use App\Models\Outlet;
use App\Models\Role;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FieldWorkerController extends Controller
{
    private function canManageFieldWorkers(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        return in_array($user->role?->slug, [
            'super_admin',
            'company_admin',
            'campaign_manager',
            'supervisor',
            'qa_officer',
        ], true);
    }

    /**
     * @param  Collection<string|int, int>  $projectCounts
     * @param  Collection<string|int, string>  $topCounties
     * @return array<string, mixed>
     */
    private function buildWorkerRow(User $collector, User $viewer, Collection $projectCounts, Collection $topCounties): array
    {
        $wc = (int) $projectCounts->get($collector->id, 0);

        $outletsCollected = $viewer->role?->slug === 'super_admin'
            ? $collector->createdOutlets()->count()
            : $collector->createdOutlets()->where('company_id', $viewer->company_id)->count();

        $thisMonth = $viewer->role?->slug === 'super_admin'
            ? $collector->createdOutlets()
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count()
            : $collector->createdOutlets()
                ->where('company_id', $viewer->company_id)
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();

        $statusLabel = match ($collector->account_status ?? 'active') {
            'inactive' => 'Inactive',
            'suspended' => 'Suspended',
            default => 'Active',
        };

        $county = $collector->home_county;
        if ($county === null || $county === '') {
            $county = (string) ($topCounties->get($collector->id) ?? '—');
        }

        return [
            'id' => (string) $collector->id,
            'name' => $collector->name,
            'role' => $collector->role?->name ?? 'Field Collector',
            'phone' => $collector->phone ?? '—',
            'email' => $collector->email,
            'county' => $county,
            'projects' => $wc,
            'outlets_collected' => $outletsCollected,
            'this_month' => $thisMonth,
            'status' => $statusLabel,
            'avatar' => 'https://ui-avatars.com/api/?size=128&background=ecfdf5&color=065f46&name='.rawurlencode($collector->name),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $collectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        if (! $collectorRoleId) {
            return response()->json([
                'summary' => [
                    'total' => 0,
                    'active' => 0,
                    'inactive' => 0,
                    'suspended' => 0,
                    'projects_assigned' => 0,
                ],
                'workers' => [],
            ]);
        }

        $query = User::query()
            ->with('role')
            ->where('role_id', $collectorRoleId);

        if ($user->role?->slug !== 'super_admin') {
            $query->where('company_id', $user->company_id);
        }

        if ($user->role?->slug === 'field_collector') {
            $query->where('users.id', $user->id);
        }

        $workers = $query->orderBy('name')->get();

        $o = (new Outlet)->getTable();
        $w = (new Ward)->getTable();

        $workerIds = $workers->pluck('id')->all();
        $companyScope = $user->role?->slug !== 'super_admin';

        $projectCounts = collect();
        $topCounties = collect();
        if ($workerIds !== []) {
            $projectCounts = DB::table('project_user')
                ->join('projects', 'projects.id', '=', 'project_user.project_id')
                ->whereIn('project_user.user_id', $workerIds)
                ->when($companyScope, fn ($q) => $q->where('projects.company_id', $user->company_id))
                ->groupBy('project_user.user_id')
                ->selectRaw('project_user.user_id, count(*) as pc')
                ->pluck('pc', 'user_id');

            $baseOutlet = DB::table($o)
                ->join($w, $w.'.id', '=', $o.'.ward_id')
                ->whereIn($o.'.created_by', $workerIds)
                ->when($companyScope, fn ($q) => $q->where($o.'.company_id', $user->company_id));

            $countyRows = (clone $baseOutlet)
                ->join('counties', 'counties.id', '=', $w.'.county_id')
                ->select($o.'.created_by', 'counties.name as county_name', DB::raw('count(*) as cnt'))
                ->groupBy($o.'.created_by', 'counties.id', 'counties.name')
                ->get();

            $topCounties = $countyRows->groupBy('created_by')->map(
                fn ($g) => $g->sortByDesc('cnt')->first()->county_name,
            );
        }

        $payload = $workers->map(fn (User $worker) => $this->buildWorkerRow($worker, $user, $projectCounts, $topCounties));

        $active = $payload->where('status', 'Active')->count();
        $inactive = $payload->where('status', 'Inactive')->count();
        $suspended = $payload->where('status', 'Suspended')->count();

        return response()->json([
            'summary' => [
                'total' => $payload->count(),
                'active' => $active,
                'inactive' => $inactive,
                'suspended' => $suspended,
                'projects_assigned' => (int) $payload->sum('projects'),
            ],
            'workers' => $payload->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        abort_if($admin === null, 401);

        if (! $this->canManageFieldWorkers($admin)) {
            abort(403, 'You cannot add field workers.');
        }

        $collectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        if (! $collectorRoleId) {
            throw ValidationException::withMessages([
                'role' => ['Field Collector role is not configured in the database.'],
            ]);
        }

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:32'],
            'county_id' => ['nullable', 'integer', 'exists:counties,id'],
        ];

        if ($admin->role?->slug === 'super_admin') {
            $rules['company_id'] = ['required', 'integer', 'exists:companies,id'];
        }

        $data = $request->validate($rules);

        $companyId = $admin->role?->slug === 'super_admin'
            ? (int) $data['company_id']
            : (int) $admin->company_id;

        if ($admin->role?->slug !== 'super_admin' && $companyId === 0) {
            throw ValidationException::withMessages([
                'company' => ['Your account must belong to a company to add field workers.'],
            ]);
        }

        $homeCountyName = null;
        if (! empty($data['county_id'])) {
            $homeCountyName = County::query()->whereKey((int) $data['county_id'])->value('name');
        }

        $plainPlaceholder = Str::password(48);
        $newUser = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => Hash::make($plainPlaceholder),
            'company_id' => $companyId,
            'role_id' => (int) $collectorRoleId,
            'account_status' => 'active',
            'home_county' => $homeCountyName,
            'notification_preferences' => User::defaultNotificationPreferences(),
            'security_preferences' => User::defaultSecurityPreferences(),
        ]);

        $newUser->load('role');

        $invitationSent = Password::sendResetLink(['email' => $newUser->email]) === Password::RESET_LINK_SENT;

        $emptyPc = collect();
        $emptyTc = collect();

        return response()->json([
            'worker' => $this->buildWorkerRow($newUser, $admin, $emptyPc, $emptyTc),
            'message' => $invitationSent
                ? 'Field worker added. They will receive an email with a link to set their own password.'
                : 'Field worker added, but the invitation email could not be sent. Use “Forgot password” on the login screen or check mail configuration.',
            'invitation_sent' => $invitationSent,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        abort_if($admin === null, 401);

        if (! $this->canManageFieldWorkers($admin)) {
            abort(403);
        }

        $collectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        abort_if(! $collectorRoleId, 500);

        $worker = User::query()
            ->whereKey($id)
            ->where('role_id', $collectorRoleId)
            ->firstOrFail();

        if ($admin->role?->slug !== 'super_admin' && (int) $worker->company_id !== (int) $admin->company_id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($worker->id)],
            'phone' => ['sometimes', 'string', 'max:32'],
            'county_id' => ['nullable', 'integer', 'exists:counties,id'],
            'account_status' => ['sometimes', 'string', Rule::in(['active', 'inactive', 'suspended'])],
        ]);

        if (array_key_exists('county_id', $validated)) {
            $validated['home_county'] = empty($validated['county_id'])
                ? null
                : County::query()->whereKey((int) $validated['county_id'])->value('name');
            unset($validated['county_id']);
        }

        $worker->fill($validated);
        $worker->save();
        $worker->refresh();
        $worker->load('role');

        $emptyPc = collect();
        $emptyTc = collect();

        return response()->json([
            'worker' => $this->buildWorkerRow($worker, $admin, $emptyPc, $emptyTc),
            'message' => 'Field worker updated.',
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        abort_if($admin === null, 401);

        if (! $this->canManageFieldWorkers($admin)) {
            abort(403);
        }

        $collectorRoleId = Role::query()->where('slug', 'field_collector')->value('id');
        abort_if(! $collectorRoleId, 500);

        $worker = User::query()
            ->whereKey($id)
            ->where('role_id', $collectorRoleId)
            ->firstOrFail();

        if ($admin->role?->slug !== 'super_admin' && (int) $worker->company_id !== (int) $admin->company_id) {
            abort(403);
        }

        $worker->account_status = 'inactive';
        $worker->save();

        return response()->json(['message' => 'Field worker deactivated.']);
    }
}
