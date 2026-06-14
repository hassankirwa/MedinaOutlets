<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
            'platform' => ['required', 'string', 'in:ios,android'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $token = DeviceToken::query()->updateOrCreate(
            ['expo_push_token' => $validated['expo_push_token']],
            [
                'user_id' => $user->id,
                'platform' => $validated['platform'],
                'device_name' => $validated['device_name'] ?? null,
                'last_used_at' => now(),
            ],
        );

        return response()->json([
            'device_token' => [
                'id' => $token->id,
                'platform' => $token->platform,
            ],
        ], $token->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
        ]);

        DeviceToken::query()
            ->where('user_id', $user->id)
            ->where('expo_push_token', $validated['expo_push_token'])
            ->delete();

        return response()->json(['message' => 'Device token removed.']);
    }
}
