<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'notification_preferences' => $user->resolvedNotificationPreferences(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'new_submission' => ['sometimes', 'boolean'],
            'sla_breach' => ['sometimes', 'boolean'],
            'rejected_submission' => ['sometimes', 'boolean'],
            'weekly_summary' => ['sometimes', 'boolean'],
            'submission_review' => ['sometimes', 'boolean'],
            'project_assignment' => ['sometimes', 'boolean'],
            'sync_reminder' => ['sometimes', 'boolean'],
            'channels' => ['sometimes', 'array'],
            'channels.in_app' => ['sometimes', 'boolean'],
            'channels.email' => ['sometimes', 'boolean'],
            'channels.push' => ['sometimes', 'boolean'],
        ]);

        $existing = $user->notification_preferences ?? [];

        foreach ([
            'new_submission',
            'sla_breach',
            'rejected_submission',
            'weekly_summary',
            'submission_review',
            'project_assignment',
            'sync_reminder',
        ] as $key) {
            if (array_key_exists($key, $validated)) {
                $existing[$key] = $validated[$key];
            }
        }

        if ($request->has('channels')) {
            $ch = $existing['channels'] ?? [];
            if (array_key_exists('in_app', $validated['channels'] ?? [])) {
                $ch['in_app'] = $validated['channels']['in_app'];
            }
            if (array_key_exists('email', $validated['channels'] ?? [])) {
                $ch['email'] = $validated['channels']['email'];
            }
            if (array_key_exists('push', $validated['channels'] ?? [])) {
                $ch['push'] = $validated['channels']['push'];
            }
            $existing['channels'] = $ch;
        }

        $user->notification_preferences = $existing;
        $user->save();

        return response()->json([
            'notification_preferences' => $user->resolvedNotificationPreferences(),
        ]);
    }
}
