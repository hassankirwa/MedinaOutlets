<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->foreignId('default_county_id')->nullable()->after('code')->constrained('counties')->nullOnDelete();
            $table->string('timezone')->default('Africa/Nairobi')->after('default_county_id');
            $table->string('date_format')->default('DD MMM, YYYY')->after('timezone');
            $table->string('project_status_default')->default('active_data_collection')->after('date_format');
            $table->json('settings')->nullable()->after('project_status_default');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropForeign(['default_county_id']);
            $table->dropColumn([
                'default_county_id',
                'timezone',
                'date_format',
                'project_status_default',
                'settings',
            ]);
        });
    }
};
