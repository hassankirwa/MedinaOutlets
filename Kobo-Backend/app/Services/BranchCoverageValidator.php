<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\BranchCoverage;
use App\Models\County;
use App\Models\Project;
use App\Models\ProjectCoverage;
use App\Models\Ward;
use Illuminate\Http\Exceptions\HttpResponseException;

class BranchCoverageValidator
{
    /**
     * @param  array<int, array{county_id: int, ward_ids: array<int>}>  $coverageRows
     */
    public function validateAndSyncBranchCoverage(Branch $branch, array $coverageRows): void
    {
        $branch->coverages()->delete();

        foreach ($coverageRows as $row) {
            $countyId = (int) $row['county_id'];
            $wardIds = array_values(array_unique(array_map('intval', $row['ward_ids'] ?? [])));

            if ($wardIds === []) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Each county must have at least one ward selected.',
                ], 422));
            }

            $validWardIds = Ward::query()
                ->where('county_id', $countyId)
                ->whereIn('id', $wardIds)
                ->pluck('id')
                ->all();

            if (count($validWardIds) !== count($wardIds)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Each ward must belong to its selected county.',
                ], 422));
            }

            foreach ($wardIds as $wardId) {
                BranchCoverage::query()->create([
                    'branch_id' => $branch->id,
                    'county_id' => $countyId,
                    'ward_id' => $wardId,
                ]);
            }
        }
    }

    /**
     * @param  array<int, array{county_id: int, ward_id: int, target_outlets?: int|null}>  $rows
     */
    public function validateAndSyncProjectCoverage(Project $project, int $branchId, array $rows): void
    {
        if ((int) $project->branch_id !== $branchId) {
            throw new HttpResponseException(response()->json([
                'message' => 'Project branch does not match coverage branch.',
            ], 422));
        }

        $allowedWards = BranchCoverage::query()
            ->where('branch_id', $branchId)
            ->get()
            ->groupBy('county_id');

        $project->coverages()->delete();

        foreach ($rows as $row) {
            $countyId = (int) $row['county_id'];
            $wardId = (int) $row['ward_id'];

            $ward = Ward::query()->where('id', $wardId)->where('county_id', $countyId)->first();
            if ($ward === null) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Ward must belong to the selected county.',
                ], 422));
            }

            $branchWards = $allowedWards->get($countyId, collect())->pluck('ward_id')->all();
            if (! in_array($wardId, $branchWards, true)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Ward is not covered by the selected branch.',
                ], 422));
            }

            ProjectCoverage::query()->create([
                'project_id' => $project->id,
                'branch_id' => $branchId,
                'county_id' => $countyId,
                'ward_id' => $wardId,
                'target_outlets' => $row['target_outlets'] ?? null,
            ]);
        }
    }

    /**
     * @return array<int, array{id: int, name: string, wards: array<int, array{id: int, name: string}>}>
     */
    public function branchCountiesWithWards(Branch $branch): array
    {
        $coverages = $branch->coverages()->with(['county', 'ward'])->get();

        return $coverages
            ->groupBy('county_id')
            ->map(function ($items, $countyId) {
                $county = $items->first()?->county;

                return [
                    'id' => (int) $countyId,
                    'name' => $county?->name ?? '',
                    'wards' => $items
                        ->filter(fn ($c) => $c->ward_id !== null)
                        ->map(fn ($c) => [
                            'id' => (int) $c->ward_id,
                            'name' => $c->ward?->name ?? '',
                        ])
                        ->unique('id')
                        ->values()
                        ->all(),
                ];
            })
            ->values()
            ->all();
    }

    public function assertWardInBranch(int $branchId, int $countyId, int $wardId): void
    {
        $exists = BranchCoverage::query()
            ->where('branch_id', $branchId)
            ->where('county_id', $countyId)
            ->where('ward_id', $wardId)
            ->exists();

        if (! $exists) {
            throw new HttpResponseException(response()->json([
                'message' => 'Ward is not in branch coverage.',
            ], 422));
        }
    }

    public function assertWardInProjectCoverage(int $projectId, int $wardId): void
    {
        $exists = ProjectCoverage::query()
            ->where('project_id', $projectId)
            ->where('ward_id', $wardId)
            ->exists();

        if (! $exists) {
            throw new HttpResponseException(response()->json([
                'message' => 'Ward is not in project coverage.',
            ], 422));
        }
    }
}
