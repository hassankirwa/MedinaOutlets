<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Branch::class);

        /** @var User $user */
        $user = $request->user();

        $query = Branch::query();

        if ($user->role?->slug !== 'super_admin') {
            $query->where('company_id', $user->company_id);
        } elseif ($request->filled('company_id')) {
            $query->where('company_id', (int) $request->query('company_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(function (Builder $q) use ($search): void {
                $q->where('name', 'like', $search)
                    ->orWhere('code', 'like', $search)
                    ->orWhere('region', 'like', $search);
            });
        }

        $branches = $query->orderBy('name')->get()->map(fn (Branch $b): array => $this->branchToArray($b));

        return response()->json(['branches' => $branches]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Branch::class);

        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:32',
            'region' => 'nullable|string|max:255',
            'manager_name' => 'nullable|string|max:255',
            'manager_phone' => 'nullable|string|max:32',
            'status' => 'required|string|in:active,inactive',
            'company_id' => 'nullable|exists:companies,id',
        ]);

        $companyId = $user->role?->slug === 'super_admin'
            ? ($validated['company_id'] ?? $user->company_id)
            : $user->company_id;

        if ($companyId === null) {
            abort(422, 'company_id is required.');
        }

        $branch = Branch::query()->create([
            'company_id' => $companyId,
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'region' => $validated['region'] ?? null,
            'manager_name' => $validated['manager_name'] ?? null,
            'manager_phone' => $validated['manager_phone'] ?? null,
            'status' => $validated['status'],
        ]);

        return response()->json(['branch' => $this->branchDetailArray($branch)], 201);
    }

    public function show(Branch $branch): JsonResponse
    {
        $this->authorize('view', $branch);

        return response()->json(['branch' => $this->branchDetailArray($branch)]);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        $this->authorize('update', $branch);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:32',
            'region' => 'nullable|string|max:255',
            'manager_name' => 'nullable|string|max:255',
            'manager_phone' => 'nullable|string|max:32',
            'status' => 'sometimes|string|in:active,inactive',
        ]);

        $branch->fill($validated);
        $branch->save();

        return response()->json(['branch' => $this->branchDetailArray($branch)]);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        $this->authorize('delete', $branch);
        $branch->delete();

        return response()->json(['ok' => true]);
    }

    public function coverage(Branch $branch): JsonResponse
    {
        $this->authorize('view', $branch);

        return response()->json(['coverage' => []]);
    }

    public function counties(Branch $branch): JsonResponse
    {
        $this->authorize('view', $branch);

        return response()->json(['counties' => []]);
    }

    /**
     * @return array<string, mixed>
     */
    private function branchToArray(Branch $branch): array
    {
        return [
            'id' => (string) $branch->id,
            'name' => $branch->name,
            'code' => $branch->code,
            'region' => $branch->region,
            'manager_name' => $branch->manager_name,
            'manager_phone' => $branch->manager_phone,
            'status' => ucfirst($branch->status),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function branchDetailArray(Branch $branch): array
    {
        return $this->branchToArray($branch);
    }
}
