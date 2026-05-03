<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outlets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained()->nullOnDelete();
            $table->string('facility_name');
            $table->string('outlet_type', 64);
            $table->string('owner_name');
            $table->string('business_phone', 64)->nullable();
            $table->string('email')->nullable();
            $table->text('physical_location');
            $table->string('landmark')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedSmallInteger('gps_accuracy_meters')->nullable();
            $table->string('type_of_account', 64)->nullable();
            $table->string('medical_facility_status', 64)->nullable();
            $table->string('outlet_serviced_by_med', 32)->nullable();
            $table->string('selected_category', 128)->nullable();
            $table->text('remarks')->nullable();
            $table->json('photos')->nullable();
            $table->string('status', 32)->default('pending');
            $table->timestamps();

            $table->index(['company_id', 'status']);
            $table->index(['created_by']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outlets');
    }
};
