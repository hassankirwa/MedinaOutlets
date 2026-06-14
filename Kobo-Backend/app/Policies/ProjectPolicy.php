<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role?->slug === 'super_admin'
            || $user->company_id !== null;
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->role?->slug === 'super_admin') {
            return true;
        }

        if ($user->company_id === null || $project->company_id !== $user->company_id) {
            return false;
        }

        if ($user->role?->slug === 'field_collector') {
            return $project->wardAssignments()->where('user_id', $user->id)->exists()
                || $project->assignedWorkers()->where('users.id', $user->id)->exists()
                || $project->projectFieldWorkers()->where('field_worker_id', $user->id)->exists();
        }

        return true;
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

    public function update(User $user, Project $project): bool
    {
        if (! in_array($user->role?->slug, [
            'super_admin',
            'company_admin',
            'campaign_manager',
            'supervisor',
            'qa_officer',
        ], true)) {
            return false;
        }

        if ($user->role?->slug === 'super_admin') {
            return true;
        }

        return $project->company_id === $user->company_id;
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    public function assignWorkers(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }

    public function assignWards(User $user, Project $project): bool
    {
        return $this->update($user, $project);
    }
}
