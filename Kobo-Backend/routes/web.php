<?php

use App\Http\Controllers\Web\PasswordResetController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/reset-password/{token}', [PasswordResetController::class, 'show'])
    ->name('password.reset');

Route::post('/reset-password', [PasswordResetController::class, 'update'])
    ->name('password.update');
