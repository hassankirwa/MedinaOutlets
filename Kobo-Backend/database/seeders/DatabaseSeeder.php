<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\County;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['slug' => 'super_admin', 'name' => 'Super Admin'],
            ['slug' => 'company_admin', 'name' => 'Company Admin'],
            ['slug' => 'campaign_manager', 'name' => 'Campaign Manager'],
            ['slug' => 'supervisor', 'name' => 'Supervisor'],
            ['slug' => 'qa_officer', 'name' => 'QA Officer'],
            ['slug' => 'field_collector', 'name' => 'Field Collector'],
            ['slug' => 'viewer', 'name' => 'Viewer'],
        ];

        foreach ($roles as $role) {
            Role::query()->updateOrCreate(
                ['slug' => $role['slug']],
                ['name' => $role['name']],
            );
        }

        $this->call(KenyaCountiesAndWardsSeeder::class);

        $company = Company::query()->updateOrCreate(
            ['code' => 'MEDINA-DEMO'],
            ['name' => 'Medina Demo Distributors'],
        );

        $adminRole = Role::query()->where('slug', 'company_admin')->firstOrFail();
        $collectorRole = Role::query()->where('slug', 'field_collector')->firstOrFail();

        User::query()->updateOrCreate(
            ['email' => 'demo@outlet.com'],
            [
                'name' => 'Demo Admin',
                'password' => Hash::make('password123'),
                'company_id' => $company->id,
                'role_id' => $adminRole->id,
                'phone' => '+254 712 345 678',
                'account_status' => 'active',
            ],
        );

        $collector = User::query()->updateOrCreate(
            ['email' => 'collector@outlet.com'],
            [
                'name' => 'Demo Collector',
                'password' => Hash::make('password123'),
                'company_id' => $company->id,
                'role_id' => $collectorRole->id,
                'phone' => '0711 000 001',
                'account_status' => 'active',
            ],
        );

        $collectorJane = User::query()->updateOrCreate(
            ['email' => 'jane@outlet.com'],
            [
                'name' => 'Jane Field',
                'password' => Hash::make('password123'),
                'company_id' => $company->id,
                'role_id' => $collectorRole->id,
                'phone' => '0711 000 002',
                'account_status' => 'active',
            ],
        );

        $countyKiambu = County::query()->where('code', '022')->firstOrFail();
        $countyNairobi = County::query()->where('code', '047')->firstOrFail();

        $wardGitothua = Ward::query()
            ->where('county_id', $countyKiambu->id)
            ->whereRaw('upper(trim(name)) = ?', ['GITOTHUA'])
            ->firstOrFail();

        $wardNairobiDemo = Ward::query()
            ->where('county_id', $countyNairobi->id)
            ->whereRaw('upper(trim(name)) = ?', ['KANGEMI'])
            ->firstOrFail();

        $demoAdmin = User::query()->where('email', 'demo@outlet.com')->firstOrFail();

        $projKiambu = Project::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'county_id' => $countyKiambu->id,
            ],
            [
                'name' => 'Outlet Census — Kiambu County',
                'description' => 'Seeded demo census project for Kiambu.',
                'status' => 'active',
                'start_date' => now()->subMonths(2)->toDateString(),
                'end_date' => now()->addMonths(6)->toDateString(),
                'created_by' => $demoAdmin->id,
            ],
        );

        $projKiambu->assignedWorkers()->sync([
            $collector->id => ['assigned_at' => now(), 'assigned_by' => $demoAdmin->id],
            $collectorJane->id => ['assigned_at' => now(), 'assigned_by' => $demoAdmin->id],
        ]);

        $projNairobi = Project::query()->updateOrCreate(
            [
                'company_id' => $company->id,
                'county_id' => $countyNairobi->id,
            ],
            [
                'name' => 'Outlet Census — Nairobi County',
                'description' => 'Seeded demo census project for Nairobi.',
                'status' => 'active',
                'start_date' => now()->subMonths(1)->toDateString(),
                'end_date' => now()->addMonths(5)->toDateString(),
                'created_by' => $demoAdmin->id,
            ],
        );

        $projNairobi->assignedWorkers()->sync([
            $collector->id => ['assigned_at' => now(), 'assigned_by' => $demoAdmin->id],
        ]);

        $demoOutlets = [
            ['facility' => 'Seed Demo Pharmacy', 'type' => 'Pharmacy', 'cat' => 'RETAIL PHARMACY', 'owner' => 'Seed Owner', 'phone' => '0700000001', 'loc' => 'Gitothua, Kiambu', 'land' => 'Near demo ward', 'lat' => -1.2, 'lng' => 36.8, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardGitothua, 'by' => $collector, 'status' => 'approved', 'day' => 0],
            ['facility' => 'Sunrise Community Pharmacy', 'type' => 'Pharmacy', 'cat' => 'RETAIL PHARMACY', 'owner' => 'Mary Wanjiku', 'phone' => '0711000002', 'loc' => 'Kangemi', 'land' => 'Ring road', 'lat' => -1.263, 'lng' => 36.806, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardNairobiDemo, 'by' => $collector, 'status' => 'approved', 'day' => 1],
            ['facility' => 'Agro Pharma Hub', 'type' => 'Pharmacy', 'cat' => 'AGRO PHARMA', 'owner' => 'Peter Otieno', 'phone' => '0711000003', 'loc' => 'Kiambu town', 'land' => 'Market', 'lat' => -1.174, 'lng' => 36.837, 'reg' => 'REGISTERED', 'med' => 'NO', 'ward' => $wardGitothua, 'by' => $collectorJane, 'status' => 'pending', 'day' => 2],
            ['facility' => 'Wholesale Medical Supplies', 'type' => 'Pharmacy', 'cat' => 'WHOLESALE PHARMACY', 'owner' => 'Grace Muthoni', 'phone' => '0711000004', 'loc' => 'Industrial area', 'land' => 'Gate B', 'lat' => -1.323, 'lng' => 36.851, 'reg' => 'UNREGISTERED', 'med' => 'YES', 'ward' => $wardNairobiDemo, 'by' => $collector, 'status' => 'approved', 'day' => 3],
            ['facility' => 'Kawangware Clinic Plus', 'type' => 'Clinic / Dispensary', 'cat' => 'PRIVATE DISPENSARY', 'owner' => 'Dr. Achieng', 'phone' => '0722000005', 'loc' => 'Kawangware', 'land' => 'Stage', 'lat' => -1.283, 'lng' => 36.744, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardNairobiDemo, 'by' => $collectorJane, 'status' => 'approved', 'day' => 4],
            ['facility' => 'Public Dispensary Ruaka', 'type' => 'Clinic / Dispensary', 'cat' => 'PUBLIC DISPENSARY', 'owner' => 'Ministry Unit', 'phone' => '0722000006', 'loc' => 'Ruaka', 'land' => 'Health centre', 'lat' => -1.209, 'lng' => 36.78, 'reg' => 'REGISTERED', 'med' => 'NO', 'ward' => $wardGitothua, 'by' => $collector, 'status' => 'pending', 'day' => 5],
            ['facility' => 'VetPlus Agrovet', 'type' => 'Agrovet', 'cat' => 'VETERINARY AGROVET', 'owner' => 'Samuel Kiprop', 'phone' => '0733000007', 'loc' => 'Thika road', 'land' => 'Exit 7', 'lat' => -1.151, 'lng' => 36.963, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardGitothua, 'by' => $collector, 'status' => 'approved', 'day' => 6],
            ['facility' => 'General Farm Inputs', 'type' => 'Agrovet', 'cat' => 'GENERAL AGROVET', 'owner' => 'Lucy Njeri', 'phone' => '0733000008', 'loc' => 'Limuru', 'land' => 'ABC plaza', 'lat' => -1.108, 'lng' => 36.642, 'reg' => 'UNREGISTERED', 'med' => 'NO', 'ward' => $wardGitothua, 'by' => $collectorJane, 'status' => 'rejected', 'day' => 7],
            ['facility' => 'Agro Dealer Express', 'type' => 'Agrovet', 'cat' => 'AGRO DEALER', 'owner' => 'David Kim', 'phone' => '0733000009', 'loc' => 'Ruiru', 'land' => 'Kamakis', 'lat' => -1.145, 'lng' => 36.956, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardGitothua, 'by' => $collector, 'status' => 'approved', 'day' => 8],
            ['facility' => 'Faith Mission Hospital', 'type' => 'Hospital', 'cat' => 'FAITH BASED', 'owner' => 'Sister Mary', 'phone' => '0744000010', 'loc' => 'Kikuyu', 'land' => 'Hill view', 'lat' => -1.254, 'lng' => 36.661, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardGitothua, 'by' => $collectorJane, 'status' => 'approved', 'day' => 9],
            ['facility' => 'Private Care Hospital', 'type' => 'Hospital', 'cat' => 'PRIVATE HOSPITAL', 'owner' => 'Dr. Malik', 'phone' => '0744000011', 'loc' => 'Lavington', 'land' => 'James Gichuru', 'lat' => -1.277, 'lng' => 36.768, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardNairobiDemo, 'by' => $collector, 'status' => 'approved', 'day' => 10],
            ['facility' => 'County Referral Public', 'type' => 'Hospital', 'cat' => 'PUBLIC HOSPITAL', 'owner' => 'County Gov', 'phone' => '0744000012', 'loc' => 'Kiambu HQ', 'land' => 'Sub county', 'lat' => -1.174, 'lng' => 36.837, 'reg' => 'REGISTERED', 'med' => 'NO', 'ward' => $wardGitothua, 'by' => $collector, 'status' => 'pending', 'day' => 11],
            ['facility' => 'Neighbourhood Shop Pharma', 'type' => 'Shop', 'cat' => 'RETAIL SHOP', 'owner' => 'Chris W.', 'phone' => '0755000013', 'loc' => 'Zimmerman', 'land' => 'Base', 'lat' => -1.216, 'lng' => 36.875, 'reg' => 'UNREGISTERED', 'med' => 'NO', 'ward' => $wardNairobiDemo, 'by' => $collectorJane, 'status' => 'approved', 'day' => 12],
            ['facility' => 'Riverside Wholesale & Retail', 'type' => 'Pharmacy', 'cat' => 'WHOLESALE & RETAIL', 'owner' => 'Anne Laboso', 'phone' => '0755000014', 'loc' => 'Thika', 'land' => 'Mall', 'lat' => -1.035, 'lng' => 37.08, 'reg' => 'REGISTERED', 'med' => 'YES', 'ward' => $wardGitothua, 'by' => $collector, 'status' => 'approved', 'day' => 13],
        ];

        foreach ($demoOutlets as $row) {
            /** @var Ward $w */
            $w = $row['ward'];
            /** @var User $by */
            $by = $row['by'];
            $createdAt = now()->subDays((int) $row['day'])->setHour(10)->setMinute(30);

            $outlet = Outlet::query()->updateOrCreate(
                [
                    'facility_name' => $row['facility'],
                    'company_id' => $company->id,
                ],
                [
                    'created_by' => $by->id,
                    'ward_id' => $w->id,
                    'outlet_type' => $row['type'],
                    'owner_name' => $row['owner'],
                    'business_phone' => $row['phone'],
                    'email' => null,
                    'physical_location' => $row['loc'],
                    'landmark' => $row['land'],
                    'latitude' => $row['lat'],
                    'longitude' => $row['lng'],
                    'gps_accuracy_meters' => 12,
                    'type_of_account' => match ($row['type']) {
                        'Pharmacy' => 'PHARMACY',
                        'Clinic / Dispensary' => 'CLINIC',
                        'Agrovet' => 'AGROVET',
                        'Hospital' => 'HOSPITAL',
                        default => 'SHOP',
                    },
                    'medical_facility_status' => $row['reg'],
                    'outlet_serviced_by_med' => $row['med'],
                    'selected_category' => $row['cat'],
                    'remarks' => 'Demo seed data',
                    'photos' => null,
                    'status' => $row['status'],
                ],
            );

            $outlet->timestamps = false;
            $outlet->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->save();
            $outlet->timestamps = true;
        }

        if (Outlet::query()->where('company_id', $company->id)->count() < 5) {
            // Safety: ensure minimum demo richness if updates skipped rows
            Outlet::query()->firstOrCreate(
                [
                    'facility_name' => 'Fallback Demo Outlet',
                    'company_id' => $company->id,
                ],
                [
                    'created_by' => $collector->id,
                    'ward_id' => $wardGitothua->id,
                    'outlet_type' => 'Pharmacy',
                    'owner_name' => 'Fallback',
                    'business_phone' => '0700000099',
                    'physical_location' => 'Kiambu',
                    'landmark' => 'HQ',
                    'latitude' => -1.2,
                    'longitude' => 36.8,
                    'type_of_account' => 'PHARMACY',
                    'medical_facility_status' => 'REGISTERED',
                    'outlet_serviced_by_med' => 'YES',
                    'selected_category' => 'RETAIL PHARMACY',
                    'status' => 'approved',
                ],
            );
        }
    }
}
