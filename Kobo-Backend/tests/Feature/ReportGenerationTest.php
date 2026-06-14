<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\Questionnaire;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_catalog_lists_available_types(): void
    {
        [$admin] = $this->seedWorkspace();

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/reports');

        $response->assertOk();
        $response->assertJsonStructure([
            'reports' => [
                ['id', 'type', 'name', 'format'],
            ],
        ]);
        $this->assertNotEmpty($response->json('reports'));
    }

    public function test_generate_report_returns_structured_rows(): void
    {
        [$admin, $branch, $project, $collector] = $this->seedWorkspace();
        Outlet::query()->create([
            'company_id' => $admin->company_id,
            'branch_id' => $branch->id,
            'project_id' => $project->id,
            'created_by' => $collector->id,
            'facility_name' => 'Outlet A',
            'outlet_type' => 'Pharmacy',
            'owner_name' => 'Owner',
            'business_phone' => '0700000001',
            'physical_location' => 'Nairobi',
            'latitude' => -1.28,
            'longitude' => 36.82,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/reports/generate?type=outlet_category_summary');

        $response->assertOk();
        $response->assertJsonPath('type', 'outlet_category_summary');
        $response->assertJsonPath('title', 'Outlet category summary');
        $response->assertJsonStructure([
            'columns',
            'rows' => [['label', 'value']],
            'generated_at',
        ]);
        $this->assertSame('Pharmacy', $response->json('rows.0.label'));
        $this->assertSame(1, $response->json('rows.0.value'));
    }

    public function test_export_report_returns_csv_download(): void
    {
        [$admin, $branch, $project, $collector] = $this->seedWorkspace();
        Outlet::query()->create([
            'company_id' => $admin->company_id,
            'branch_id' => $branch->id,
            'project_id' => $project->id,
            'created_by' => $collector->id,
            'facility_name' => 'Outlet B',
            'outlet_type' => 'Shop',
            'owner_name' => 'Owner',
            'business_phone' => '0700000002',
            'physical_location' => 'Nairobi',
            'latitude' => -1.29,
            'longitude' => 36.83,
            'status' => 'approved',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->get('/api/reports/export?type=outlet_category_summary&format=csv');

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $body = $response->streamedContent();
        $this->assertStringContainsString('Category', $body);
        $this->assertStringContainsString('Shop', $body);
    }

    /**
     * @return array{0: User, 1: Branch, 2: Project, 3: User}
     */
    private function seedWorkspace(): array
    {
        $company = Company::query()->create(['name' => 'Test Co', 'code' => 'TST']);
        $adminRole = Role::query()->create(['slug' => 'company_admin', 'name' => 'Company Admin']);
        $collectorRole = Role::query()->create(['slug' => 'field_collector', 'name' => 'Field Collector']);
        $admin = User::factory()->create(['company_id' => $company->id, 'role_id' => $adminRole->id]);
        $collector = User::factory()->create(['company_id' => $company->id, 'role_id' => $collectorRole->id, 'name' => 'Collector One']);
        $branch = Branch::query()->create(['company_id' => $company->id, 'name' => 'Main Branch', 'status' => 'active']);
        $questionnaire = Questionnaire::query()->create(['name' => 'Form', 'status' => 'active']);
        $project = Project::query()->create([
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'name' => 'Census',
            'status' => 'active',
            'questionnaire_id' => $questionnaire->id,
        ]);

        return [$admin, $branch, $project, $collector];
    }
}
