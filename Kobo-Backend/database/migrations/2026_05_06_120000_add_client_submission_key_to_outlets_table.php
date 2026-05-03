<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->uuid('client_submission_key')->nullable()->after('created_by');
            $table->unique(['created_by', 'client_submission_key'], 'outlets_created_by_client_submission_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->dropUnique('outlets_created_by_client_submission_key_unique');
            $table->dropColumn('client_submission_key');
        });
    }
};
