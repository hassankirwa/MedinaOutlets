<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\CountyController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FieldWorkerController;
use App\Http\Controllers\Api\NotificationFeedController;
use App\Http\Controllers\Api\NotificationPreferenceController;
use App\Http\Controllers\Api\OutletController;
use App\Http\Controllers\Api\OutletSpreadsheetController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SettingsPasswordController;
use App\Http\Controllers\Api\WorkspaceSettingsController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/counties', [CountyController::class, 'index']);
    Route::get('/counties/{county}', [CountyController::class, 'show']);

    Route::get('/dashboard/stats', DashboardController::class);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    Route::put('/projects/{project}/assignments', [ProjectController::class, 'syncAssignments']);
    Route::put('/projects/{project}/ward-assignments', [ProjectController::class, 'syncWardAssignments']);

    Route::get('/my/ward-assignments', [ProjectController::class, 'myAssignments']);
    Route::get('/my/outlets', [OutletController::class, 'mySubmissions']);

    Route::get('/companies', [CompanyController::class, 'index']);
    Route::get('/field-workers', [FieldWorkerController::class, 'index']);
    Route::post('/field-workers', [FieldWorkerController::class, 'store']);
    Route::patch('/field-workers/{id}', [FieldWorkerController::class, 'update']);
    Route::delete('/field-workers/{id}', [FieldWorkerController::class, 'destroy']);

    Route::get('/settings/workspace', [WorkspaceSettingsController::class, 'show']);
    Route::patch('/settings/profile', [WorkspaceSettingsController::class, 'updateProfile']);
    /** Multipart uploads: many clients/proxies omit file bodies on PATCH — use POST for avatar uploads. */
    Route::post('/settings/profile', [WorkspaceSettingsController::class, 'updateProfile']);
    Route::patch('/settings/company', [WorkspaceSettingsController::class, 'updateCompany']);
    Route::patch('/settings/organization', [WorkspaceSettingsController::class, 'updateOrganization']);
    Route::post('/settings/password', [SettingsPasswordController::class, 'update']);
    Route::patch('/settings/security', [WorkspaceSettingsController::class, 'updateSecurityPreferences']);
    Route::get('/settings/notifications', [NotificationPreferenceController::class, 'show']);
    Route::patch('/settings/notifications', [NotificationPreferenceController::class, 'update']);

    Route::get('/notifications', [NotificationFeedController::class, 'index']);
    Route::delete('/notifications', [NotificationFeedController::class, 'clearAll']);
    Route::get('/notifications/unread-count', [NotificationFeedController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationFeedController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationFeedController::class, 'markAllRead']);

    Route::get('/outlets', [OutletController::class, 'index']);
    Route::get('/outlets/spreadsheet/template', [OutletSpreadsheetController::class, 'template']);
    Route::get('/outlets/spreadsheet/export', [OutletSpreadsheetController::class, 'export']);
    Route::post('/outlets/spreadsheet/import', [OutletSpreadsheetController::class, 'import']);
    Route::patch('/outlets/bulk-status', [OutletController::class, 'bulkUpdateStatus']);
    Route::post('/outlets', [OutletController::class, 'store']);
    Route::get('/outlets/{outlet}/photos/{index}', [OutletController::class, 'photo'])
        ->whereNumber('index');
    Route::get('/outlets/{outlet}', [OutletController::class, 'show']);
    Route::patch('/outlets/{outlet}', [OutletController::class, 'update']);
});
