<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (CanResetPassword $notifiable, string $token): string {
            $base = rtrim((string) (env('FRONTEND_URL') ?: config('app.url')), '/');

            return $base.'/reset-password/'.$token.'?email='.urlencode((string) $notifiable->getEmailForPasswordReset());
        });
    }
}
