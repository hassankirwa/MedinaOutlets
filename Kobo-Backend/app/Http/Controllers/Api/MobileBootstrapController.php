<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileBootstrapController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        if ($user->role?->slug !== 'field_collector') {
            return response()->json([
                'assigned_branches' => [],
                'active_projects' => [],
            ]);
        }

        $branches = $user->branches()
            ->where('status', 'active')
            ->orderBy('name')
            ->get()
            ->map(fn ($b) => [
                'id' => (string) $b->id,
                'name' => $b->name,
                'code' => $b->code,
            ]);

        $projects = Project::query()
            ->with(['branch', 'questionnaire'])
            ->whereIn('status', ['active', 'paused'])
            ->whereHas(
                'projectFieldWorkers',
                fn (Builder $pfw) => $pfw->where('field_worker_id', $user->id)->where('status', 'active'),
            )
            ->when($user->company_id !== null, fn ($q) => $q->where('company_id', $user->company_id))
            ->orderBy('name')
            ->get()
            ->map(fn (Project $p): array => [
                'id' => (string) $p->id,
                'name' => $p->name,
                'status' => $p->status,
                'branch' => $p->branch?->name ?? '',
                'branch_id' => $p->branch_id ? (string) $p->branch_id : null,
                'questionnaire_id' => $p->questionnaire_id ? (string) $p->questionnaire_id : null,
                'questionnaire_name' => $p->questionnaire?->name,
            ]);

        return response()->json([
            'assigned_branches' => $branches->values()->all(),
            'active_projects' => $projects->values()->all(),
        ]);
    }
}
