<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('outlets:notify-sla-breaches')->hourly();

Schedule::command('reports:weekly-summary')
    ->weeklyOn(1, '8:00')
    ->timezone('Africa/Nairobi');
