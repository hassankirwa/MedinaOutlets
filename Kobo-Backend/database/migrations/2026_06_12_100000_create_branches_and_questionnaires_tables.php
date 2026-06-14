<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 32)->nullable();
            $table->string('region')->nullable();
            $table->string('manager_name')->nullable();
            $table->string('manager_phone', 32)->nullable();
            $table->string('status', 32)->default('active');
            $table->timestamps();

            $table->unique(['company_id', 'code']);
            $table->index(['company_id', 'status']);
        });

        Schema::create('branch_coverages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('county_id')->constrained()->restrictOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamps();

            $table->unique(['branch_id', 'county_id', 'ward_id']);
            $table->index(['branch_id', 'county_id']);
        });

        Schema::create('branch_field_workers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['branch_id', 'user_id']);
        });

        Schema::create('questionnaires', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('schema_json')->nullable();
            $table->string('status', 32)->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questionnaires');
        Schema::dropIfExists('branch_field_workers');
        Schema::dropIfExists('branch_coverages');
        Schema::dropIfExists('branches');
    }
};
