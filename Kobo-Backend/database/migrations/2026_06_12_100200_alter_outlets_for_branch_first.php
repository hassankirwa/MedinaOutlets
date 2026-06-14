<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outlets', function (Blueprint $table): void {
            $table->foreignId('project_id')->nullable()->after('company_id')->constrained()->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->after('project_id')->constrained()->nullOnDelete();
            $table->foreignId('county_id')->nullable()->after('branch_id')->constrained()->nullOnDelete();
            $table->foreignId('questionnaire_id')->nullable()->after('county_id')->constrained()->nullOnDelete();
            $table->string('captured_place_name')->nullable()->after('gps_accuracy_meters');
            $table->text('reverse_geocoded_address')->nullable()->after('captured_place_name');

            $table->index(['project_id', 'status']);
            $table->index(['branch_id', 'county_id']);
        });

        Schema::create('submission_answers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('outlet_id')->constrained()->cascadeOnDelete();
            $table->string('question_key');
            $table->string('question_label')->nullable();
            $table->text('answer_value')->nullable();
            $table->timestamps();

            $table->unique(['outlet_id', 'question_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submission_answers');

        Schema::table('outlets', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('project_id');
            $table->dropConstrainedForeignId('branch_id');
            $table->dropConstrainedForeignId('county_id');
            $table->dropConstrainedForeignId('questionnaire_id');
            $table->dropColumn(['captured_place_name', 'reverse_geocoded_address']);
        });
    }
};
