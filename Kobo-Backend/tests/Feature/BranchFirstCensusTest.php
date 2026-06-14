<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\ProjectFieldWorker;
use App\Models\Questionnaire;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchFirstCensusTest extends TestCase
{
    use RefreshDatabase;

    public function test_branch_can_be_created_without_coverage(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $adminRole = Role::query()->create(['slug' => 'company_admin', 'name' => 'Company Admin']);
        $admin = User::factory()->create(['company_id' => $company->id, 'role_id' => $adminRole->id]);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/branches', [
            'name' => 'Narok Branch',
            'code' => 'NRK',
            'region' => 'Rift Valley',
            'status' => 'active',
        ]);

        $response->assertCreated();
        $response->assertJsonFragment(['name' => 'Narok Branch', 'code' => 'NRK']);
    }

    public function test_field_collector_submission_requires_project_assignment(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $collectorRole = Role::query()->create(['slug' => 'field_collector', 'name' => 'Field Collector']);
        $collector = User::factory()->create(['company_id' => $company->id, 'role_id' => $collectorRole->id]);
        Sanctum::actingAs($collector);

        $response = $this->postJson('/api/outlets', [
            'facility_name' => 'Test Outlet',
            'owner_name' => 'Owner',
            'business_phone' => '0700000000',
            'physical_location' => 'Here',
            'latitude' => -1.2,
            'longitude' => 36.8,
        ]);

        $response->assertStatus(422);
    }

    public function test_field_collector_can_submit_without_ward_when_assigned_to_project(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $collectorRole = Role::query()->create(['slug' => 'field_collector', 'name' => 'Field Collector']);
        $collector = User::factory()->create(['company_id' => $company->id, 'role_id' => $collectorRole->id]);
        $branch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Narok Branch', 'status' => 'active']);
        $questionnaire = Questionnaire::query()->create(['name' => 'Form', 'status' => 'active']);
        $project = Project::query()->create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'name' => 'Narok Census',
            'status' => 'active',
            'questionnaire_id' => $questionnaire->id,
        ]);
        ProjectFieldWorker::query()->create([
            'project_id' => $project->id,
            'field_worker_id' => $collector->id,
            'branch_id' => $branch->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($collector);

        $response = $this->postJson('/api/outlets', [
            'project_id' => $project->id,
            'branch_id' => $branch->id,
            'questionnaire_id' => $questionnaire->id,
            'facility_name' => 'Hope Pharmacy',
            'owner_name' => 'Owner',
            'business_phone' => '0700000000',
            'physical_location' => 'Main Street',
            'landmark' => 'Market',
            'latitude' => -1.2864,
            'longitude' => 36.8172,
            'captured_address' => 'Kilimani, Nairobi, Kenya',
            'captured_ward' => 'Kilimani',
            'captured_county' => 'Nairobi',
            'region' => 'Nairobi',
            'country' => 'Kenya',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('outlets', [
            'facility_name' => 'Hope Pharmacy',
            'project_id' => $project->id,
            'captured_county' => 'Nairobi',
            'captured_ward' => 'Kilimani',
        ]);
    }

    public function test_project_list_includes_branch(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $adminRole = Role::query()->create(['slug' => 'company_admin', 'name' => 'Company Admin']);
        $admin = User::factory()->create(['company_id' => $company->id, 'role_id' => $adminRole->id]);
        $branch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Narok Branch', 'status' => 'active']);
        $questionnaire = Questionnaire::query()->create(['name' => 'Form', 'status' => 'active']);
        Project::query()->create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'name' => 'Narok Census',
            'status' => 'active',
            'questionnaire_id' => $questionnaire->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/projects');
        $response->assertOk();
        $response->assertJsonFragment(['branch' => 'Narok Branch', 'name' => 'Narok Census']);
    }

    public function test_mobile_bootstrap_returns_projects_without_county_wards(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $collectorRole = Role::query()->create(['slug' => 'field_collector', 'name' => 'Field Collector']);
        $collector = User::factory()->create(['company_id' => $company->id, 'role_id' => $collectorRole->id]);
        $branch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Narok Branch', 'status' => 'active']);
        $questionnaire = Questionnaire::query()->create(['name' => 'Form', 'status' => 'active']);
        $project = Project::query()->create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'name' => 'Narok Census',
            'status' => 'active',
            'questionnaire_id' => $questionnaire->id,
        ]);
        ProjectFieldWorker::query()->create([
            'project_id' => $project->id,
            'field_worker_id' => $collector->id,
            'branch_id' => $branch->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($collector);

        $response = $this->getJson('/api/mobile/bootstrap');
        $response->assertOk();
        $response->assertJsonPath('active_projects.0.name', 'Narok Census');
        $response->assertJsonPath('active_projects.0.branch_id', (string) $branch->id);
        $response->assertJsonMissingPath('active_projects.0.counties');
        $response->assertJsonMissingPath('active_projects.0.wards');
    }

    public function test_company_admin_can_bulk_delete_outlets(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $adminRole = Role::query()->create(['slug' => 'company_admin', 'name' => 'Company Admin']);
        $admin = User::factory()->create(['company_id' => $company->id, 'role_id' => $adminRole->id]);
        $branch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Narok Branch', 'status' => 'active']);
        $questionnaire = Questionnaire::query()->create(['name' => 'Form', 'status' => 'active']);
        $project = Project::query()->create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'name' => 'Narok Census',
            'status' => 'active',
            'questionnaire_id' => $questionnaire->id,
        ]);

        $outletA = Outlet::query()->create([
            'company_id' => $company->id,
            'project_id' => $project->id,
            'branch_id' => $branch->id,
            'questionnaire_id' => $questionnaire->id,
            'created_by' => $admin->id,
            'facility_name' => 'Outlet A',
            'outlet_type' => 'pharmacy',
            'owner_name' => 'Owner A',
            'business_phone' => '0700000001',
            'physical_location' => 'Street A',
            'latitude' => -1.2864,
            'longitude' => 36.8172,
            'status' => 'pending',
        ]);
        $outletB = Outlet::query()->create([
            'company_id' => $company->id,
            'project_id' => $project->id,
            'branch_id' => $branch->id,
            'questionnaire_id' => $questionnaire->id,
            'created_by' => $admin->id,
            'facility_name' => 'Outlet B',
            'outlet_type' => 'pharmacy',
            'owner_name' => 'Owner B',
            'business_phone' => '0700000002',
            'physical_location' => 'Street B',
            'latitude' => -1.2865,
            'longitude' => 36.8173,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/outlets/bulk-delete', [
            'outlet_ids' => [$outletA->id, $outletB->id],
        ]);

        $response->assertOk();
        $response->assertJson(['deleted' => 2]);
        $this->assertDatabaseMissing('outlets', ['id' => $outletA->id]);
        $this->assertDatabaseMissing('outlets', ['id' => $outletB->id]);
    }

    public function test_field_collector_submission_stores_alternative_phone(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $collectorRole = Role::query()->create(['slug' => 'field_collector', 'name' => 'Field Collector']);
        $collector = User::factory()->create(['company_id' => $company->id, 'role_id' => $collectorRole->id]);
        $branch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Narok Branch', 'status' => 'active']);
        $questionnaire = Questionnaire::query()->create(['name' => 'Form', 'status' => 'active']);
        $project = Project::query()->create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'name' => 'Narok Census',
            'status' => 'active',
            'questionnaire_id' => $questionnaire->id,
        ]);
        ProjectFieldWorker::query()->create([
            'project_id' => $project->id,
            'field_worker_id' => $collector->id,
            'branch_id' => $branch->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($collector);

        $response = $this->postJson('/api/outlets', [
            'project_id' => $project->id,
            'branch_id' => $branch->id,
            'questionnaire_id' => $questionnaire->id,
            'facility_name' => 'Hope Pharmacy',
            'owner_name' => 'Owner',
            'business_phone' => '0700000000',
            'alternative_phone' => '0711111111',
            'physical_location' => 'Main Street',
            'latitude' => -1.2864,
            'longitude' => 36.8172,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('outlets', [
            'facility_name' => 'Hope Pharmacy',
            'alternative_phone' => '0711111111',
        ]);
    }

    public function test_submission_branch_id_is_derived_from_project(): void
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $collectorRole = Role::query()->create(['slug' => 'field_collector', 'name' => 'Field Collector']);
        $collector = User::factory()->create(['company_id' => $company->id, 'role_id' => $collectorRole->id]);
        $branch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Narok Branch', 'status' => 'active']);
        $otherBranch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Other Branch', 'status' => 'active']);
        $questionnaire = Questionnaire::query()->create(['name' => 'Form', 'status' => 'active']);
        $project = Project::query()->create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'name' => 'Narok Census',
            'status' => 'active',
            'questionnaire_id' => $questionnaire->id,
        ]);
        ProjectFieldWorker::query()->create([
            'project_id' => $project->id,
            'field_worker_id' => $collector->id,
            'branch_id' => $branch->id,
            'status' => 'active',
        ]);

        Sanctum::actingAs($collector);

        $response = $this->postJson('/api/outlets', [
            'project_id' => $project->id,
            'branch_id' => $otherBranch->id,
            'questionnaire_id' => $questionnaire->id,
            'facility_name' => 'Wrong Branch Outlet',
            'owner_name' => 'Owner',
            'business_phone' => '0700000000',
            'physical_location' => 'Main Street',
            'latitude' => -1.2864,
            'longitude' => 36.8172,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('outlets', [
            'facility_name' => 'Wrong Branch Outlet',
            'branch_id' => $branch->id,
        ]);
    }
}
