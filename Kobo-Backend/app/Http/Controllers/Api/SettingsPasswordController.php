<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class SettingsPasswordController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'sign_out_other_sessions' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();

        $user->password = $validated['password'];
        $user->save();

        $signOut = array_key_exists('sign_out_other_sessions', $validated)
            ? (bool) $validated['sign_out_other_sessions']
            : (bool) ($user->resolvedSecurityPreferences()['sign_out_other_sessions_after_password_change'] ?? true);

        if ($signOut) {
            $current = $user->currentAccessToken();
            $user->tokens()->when($current, fn ($q) => $q->where('id', '!=', $current->id))->delete();
        }

        return response()->json(['message' => 'Password updated']);
    }
}
