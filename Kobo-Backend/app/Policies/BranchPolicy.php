<?php

namespace App\Policies;

use App\Models\Branch;
use App\Models\User;

class BranchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role?->slug === 'super_admin'
            || $user->company_id !== null;
    }

    public function view(User $user, Branch $branch): bool
    {
        if ($user->role?->slug === 'super_admin') {
            return true;
        }

        return $user->company_id !== null && $branch->company_id === $user->company_id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role?->slug, [
            'super_admin',
            'company_admin',
            'campaign_manager',
            'supervisor',
            'qa_officer',
        ], true);
    }

    public function update(User $user, Branch $branch): bool
    {
        if (! $this->create($user)) {
            return false;
        }

        if ($user->role?->slug === 'super_admin') {
            return true;
        }

        return $branch->company_id === $user->company_id;
    }

    public function delete(User $user, Branch $branch): bool
    {
        return $this->update($user, $branch);
    }
}
