<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Support\WorkspaceDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WorkspaceSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->workspacePayload($request));
    }

    /**
     * @return array<string, mixed>
     */
    private function workspacePayload(Request $request): array
    {
        $user = $request->user();
        abort_if($user === null, 401);
        $user->refresh();
        $user->loadMissing(['company.defaultCounty', 'role']);

        $companyPayload = null;
        if ($user->company) {
            $c = $user->company;
            $mergedSettings = WorkspaceDefaults::mergeCompanySettings($c->settings);

            $companyPayload = [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
                'default_county_id' => $c->default_county_id,
                'default_county_name' => $c->defaultCounty?->name,
                'timezone' => $c->timezone,
                'date_format' => $c->date_format,
                'project_status_default' => $c->project_status_default,
                'settings' => $mergedSettings,
            ];
        }

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar_url' => $user->publicAvatarUrl($request),
                'role' => $user->role
                    ? ['slug' => $user->role->slug, 'name' => $user->role->name]
                    : null,
            ],
            'notification_preferences' => $user->resolvedNotificationPreferences(),
            'security_preferences' => $user->resolvedSecurityPreferences(),
            'company' => $companyPayload,
        ];
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->hasFile('avatar')) {
            $request->validate([
                'avatar' => ['required', 'image', 'max:4096'],
                'name' => ['sometimes', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:64'],
            ]);

            $path = $request->file('avatar')->store('avatars', 'public');
            if ($user->avatar_path && $user->avatar_path !== $path) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $user->avatar_path = $path;
            $user->fill($request->only(['name', 'phone']));
            $user->save();
            $user->refresh();

            return response()->json($this->workspacePayload($request));
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:64',
            'remove_avatar' => 'sometimes|boolean',
        ]);

        if ($request->boolean('remove_avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $user->avatar_path = null;
        }

        $user->fill(collect($validated)->except(['remove_avatar'])->all());
        $user->save();

        return response()->json($this->workspacePayload($request));
    }

    public function updateCompany(Request $request): JsonResponse
    {
        return $this->updateOrganization($request);
    }

    public function updateOrganization(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->loadMissing('role');

        if (! in_array($user->role?->slug, ['super_admin', 'company_admin'], true)) {
            abort(403, 'You cannot update organization settings.');
        }

        $company = $user->company;
        if ($company === null && $user->role?->slug === 'super_admin' && $request->filled('company_id')) {
            $company = Company::query()->find((int) $request->input('company_id'));
        }

        if ($company === null) {
            abort(response()->json(['message' => 'No organization associated with this account.'], 422));
        }

        if ($user->role?->slug === 'company_admin' && (int) $company->id !== (int) $user->company_id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:64',
            'company_id' => 'sometimes|integer|exists:companies,id',
            'default_county_id' => 'nullable|integer|exists:counties,id',
            'timezone' => 'sometimes|string|max:64',
            'date_format' => 'sometimes|string|max:64',
            'project_status_default' => 'sometimes|string|max:64',
            'users_roles' => 'sometimes|array',
            'users_roles.super_admin_manage_config' => 'sometimes|boolean',
            'users_roles.data_manager_approve_reject' => 'sometimes|boolean',
            'users_roles.field_supervisor_review' => 'sometimes|boolean',
            'users_roles.viewer_reports_only' => 'sometimes|boolean',
            'data_collection_rules' => 'sometimes|array',
            'workflow_approvals' => 'sometimes|array',
            'map_defaults' => 'sometimes|array',
        ]);

        if (isset($validated['name'])) {
            $company->name = $validated['name'];
        }
        if (array_key_exists('code', $validated)) {
            $company->code = $validated['code'];
        }
        if (array_key_exists('default_county_id', $validated)) {
            $company->default_county_id = $validated['default_county_id'];
        }
        if (isset($validated['timezone'])) {
            $company->timezone = $validated['timezone'];
        }
        if (isset($validated['date_format'])) {
            $company->date_format = $validated['date_format'];
        }
        if (isset($validated['project_status_default'])) {
            $company->project_status_default = $validated['project_status_default'];
        }

        $settings = WorkspaceDefaults::mergeCompanySettings($company->settings);

        foreach (['users_roles', 'data_collection_rules', 'workflow_approvals', 'map_defaults'] as $section) {
            if (! isset($validated[$section]) || ! is_array($validated[$section])) {
                continue;
            }
            $settings[$section] = array_replace_recursive(
                $settings[$section] ?? [],
                $validated[$section]
            );
        }

        $company->settings = $settings;
        $company->save();

        return response()->json($this->workspacePayload($request));
    }

    public function updateSecurityPreferences(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $validated = $request->validate([
            'sign_out_other_sessions_after_password_change' => ['sometimes', 'boolean'],
            'require_two_factor' => ['sometimes', 'boolean'],
        ]);

        $merged = array_replace_recursive(
            $user->security_preferences ?? [],
            $validated
        );

        $user->security_preferences = $merged;
        $user->save();

        return response()->json($this->workspacePayload($request));
    }
}
