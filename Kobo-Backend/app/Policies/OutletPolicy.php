<?php

namespace App\Policies;

use App\Models\Outlet;
use App\Models\User;

class OutletPolicy
{
    /**
     * Company-wide outlet listing (admin / QA). Field collectors use {@see OutletController::mySubmissions} only.
     */
    public function viewAny(User $user): bool
    {
        if ($user->role?->slug === 'field_collector') {
            return false;
        }

        return $user->role?->slug === 'super_admin' || $user->company_id !== null;
    }

    public function view(User $user, Outlet $outlet): bool
    {
        if ($user->role?->slug === 'super_admin') {
            return true;
        }

        if ($user->company_id === null) {
            return false;
        }

        if ($outlet->company_id !== $user->company_id) {
            return false;
        }

        if ($user->role?->slug === 'field_collector') {
            return $outlet->created_by === $user->id;
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->company_id !== null;
    }

    public function update(User $user, Outlet $outlet): bool
    {
        if (! in_array($user->role?->slug, ['super_admin', 'company_admin', 'qa_officer'], true)) {
            return false;
        }

        if ($user->role?->slug === 'super_admin') {
            return true;
        }

        return $outlet->company_id === $user->company_id;
    }

    public function delete(User $user, Outlet $outlet): bool
    {
        if (! in_array($user->role?->slug, ['super_admin', 'company_admin', 'qa_officer'], true)) {
            return false;
        }

        if ($user->role?->slug === 'super_admin') {
            return true;
        }

        return $outlet->company_id === $user->company_id;
    }
}
