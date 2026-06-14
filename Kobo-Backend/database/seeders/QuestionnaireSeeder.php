<?php

namespace Database\Seeders;

use App\Models\Questionnaire;
use Illuminate\Database\Seeder;

class QuestionnaireSeeder extends Seeder
{
    public function run(): void
    {
        Questionnaire::query()->updateOrCreate(
            ['name' => 'Outlet Census Form'],
            [
                'description' => 'Standard outlet census questionnaire for Medina distributors.',
                'status' => 'active',
                'schema_json' => [
                    'sections' => [
                        [
                            'key' => 'classification',
                            'title' => 'Outlet Classification',
                            'fields' => [
                                ['key' => 'outlet_type', 'label' => 'Outlet Type', 'type' => 'select'],
                                ['key' => 'medical_facility_status', 'label' => 'Medical Facility Status', 'type' => 'select'],
                                ['key' => 'selected_category', 'label' => 'Category', 'type' => 'select'],
                            ],
                        ],
                        [
                            'key' => 'facility',
                            'title' => 'Facility Details',
                            'fields' => [
                                ['key' => 'facility_name', 'label' => 'Facility Name', 'type' => 'text'],
                                ['key' => 'owner_name', 'label' => 'Owner Name', 'type' => 'text'],
                                ['key' => 'business_phone', 'label' => 'Business Phone', 'type' => 'phone'],
                                ['key' => 'email', 'label' => 'Email', 'type' => 'email'],
                            ],
                        ],
                        [
                            'key' => 'location',
                            'title' => 'Location',
                            'fields' => [
                                ['key' => 'physical_location', 'label' => 'Physical Location', 'type' => 'text'],
                                ['key' => 'landmark', 'label' => 'Nearest Landmark', 'type' => 'text'],
                                ['key' => 'latitude', 'label' => 'Latitude', 'type' => 'gps'],
                                ['key' => 'longitude', 'label' => 'Longitude', 'type' => 'gps'],
                            ],
                        ],
                        [
                            'key' => 'photos',
                            'title' => 'Photos',
                            'fields' => [
                                ['key' => 'photos', 'label' => 'Outlet Photos', 'type' => 'photos'],
                            ],
                        ],
                    ],
                ],
            ],
        );
    }
}
