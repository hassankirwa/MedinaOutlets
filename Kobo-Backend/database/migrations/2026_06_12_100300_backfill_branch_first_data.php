<?php

use App\Models\Branch;
use App\Models\BranchCoverage;
use App\Models\County;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\ProjectCoverage;
use App\Models\ProjectFieldWorker;
use App\Models\ProjectWardAssignment;
use App\Models\Ward;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $projects = Project::query()->with('county')->get();

        foreach ($projects as $project) {
            if ($project->branch_id !== null) {
                continue;
            }

            $county = $project->county;
            if ($county === null) {
                continue;
            }

            $branch = Branch::query()->firstOrCreate(
                [
                    'company_id' => $project->company_id,
                    'name' => $county->name.' Branch',
                ],
                [
                    'code' => $county->code ?? strtoupper(substr(preg_replace('/\s+/', '', $county->name), 0, 6)),
                    'region' => $county->name,
                    'status' => 'active',
                ],
            );

            $wardIds = Ward::query()->where('county_id', $county->id)->pluck('id');
            foreach ($wardIds as $wardId) {
                BranchCoverage::query()->firstOrCreate([
                    'branch_id' => $branch->id,
                    'county_id' => $county->id,
                    'ward_id' => $wardId,
                ]);
            }

            $project->update(['branch_id' => $branch->id]);

            $assignments = ProjectWardAssignment::query()
                ->where('project_id', $project->id)
                ->get();

            foreach ($assignments as $assignment) {
                ProjectCoverage::query()->firstOrCreate([
                    'project_id' => $project->id,
                    'ward_id' => $assignment->ward_id,
                ], [
                    'branch_id' => $branch->id,
                    'county_id' => $county->id,
                ]);

                ProjectFieldWorker::query()->firstOrCreate([
                    'project_id' => $project->id,
                    'field_worker_id' => $assignment->user_id,
                    'ward_id' => $assignment->ward_id,
                ], [
                    'branch_id' => $branch->id,
                    'county_id' => $county->id,
                    'status' => 'active',
                ]);
            }

            Outlet::query()
                ->whereNull('project_id')
                ->whereNotNull('ward_id')
                ->whereIn('ward_id', $wardIds)
                ->where('company_id', $project->company_id)
                ->update([
                    'project_id' => $project->id,
                    'branch_id' => $branch->id,
                    'county_id' => $county->id,
                ]);
        }
    }

    public function down(): void
    {
        DB::table('project_field_workers')->truncate();
        DB::table('project_coverages')->truncate();
        Outlet::query()->update([
            'project_id' => null,
            'branch_id' => null,
            'county_id' => null,
            'questionnaire_id' => null,
        ]);
        Project::query()->update(['branch_id' => null, 'manager_id' => null, 'questionnaire_id' => null, 'published_at' => null]);
        DB::table('branch_coverages')->truncate();
        DB::table('branch_field_workers')->truncate();
        DB::table('branches')->truncate();
    }
};
