<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('wards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('county_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sub_county_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('estimated_outlets')->nullable();
            $table->unsignedTinyInteger('priority')->nullable();
            $table->string('urban_rural_class', 32)->nullable();
            $table->timestamps();

            $table->unique(['county_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wards');
    }
};
