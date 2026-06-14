<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outlets', function (Blueprint $table): void {
            $table->text('captured_address')->nullable()->after('reverse_geocoded_address');
            $table->string('road')->nullable()->after('captured_address');
            $table->string('suburb')->nullable()->after('road');
            $table->string('captured_ward')->nullable()->after('suburb');
            $table->string('captured_county')->nullable()->after('captured_ward');
            $table->string('region')->nullable()->after('captured_county');
            $table->string('country')->nullable()->after('region');

            $table->index('captured_county');
            $table->index('captured_ward');
        });
    }

    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table): void {
            $table->dropIndex(['captured_county']);
            $table->dropIndex(['captured_ward']);
            $table->dropColumn([
                'captured_address',
                'road',
                'suburb',
                'captured_ward',
                'captured_county',
                'region',
                'country',
            ]);
        });
    }
};
