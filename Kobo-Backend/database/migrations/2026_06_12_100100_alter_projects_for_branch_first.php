<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->foreignId('branch_id')->nullable()->after('company_id')->constrained()->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->foreignId('questionnaire_id')->nullable()->after('manager_id')->constrained()->nullOnDelete();
            $table->timestamp('published_at')->nullable()->after('end_date');
        });

        Schema::create('project_coverages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('county_id')->constrained()->restrictOnDelete();
            $table->foreignId('ward_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('target_outlets')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'ward_id']);
            $table->index(['project_id', 'county_id']);
        });

        Schema::create('project_field_workers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('field_worker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('county_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 32)->default('active');
            $table->timestamps();

            $table->index(['project_id', 'field_worker_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_field_workers');
        Schema::dropIfExists('project_coverages');

        Schema::table('projects', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('branch_id');
            $table->dropConstrainedForeignId('manager_id');
            $table->dropConstrainedForeignId('questionnaire_id');
            $table->dropColumn('published_at');
        });
    }
};
