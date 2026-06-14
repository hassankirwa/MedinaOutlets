<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Project;
use App\Models\User;
use App\Notifications\ProjectAssignmentNotification;
use App\Notifications\SubmissionReviewedNotification;
use Throwable;

class CollectorNotificationService
{
    /** @var list<string> */
    private const REVIEW_STATUSES = ['approved', 'rejected', 'needs_correction'];

    public function notifySubmissionReviewed(Outlet $outlet, string $newStatus, string $previousStatus): void
    {
        if ($newStatus === $previousStatus) {
            return;
        }

        if (! in_array($newStatus, self::REVIEW_STATUSES, true)) {
            return;
        }

        $outlet->loadMissing(['creator.role']);
        $creator = $outlet->creator;
        if ($creator === null || $creator->role?->slug !== 'field_collector') {
            return;
        }

        $this->safeNotify($creator, new SubmissionReviewedNotification($outlet, $newStatus));
    }

    public function notifyProjectAssignment(User $collector, Project $project): void
    {
        $collector->loadMissing('role');
        if ($collector->role?->slug !== 'field_collector') {
            return;
        }

        $this->safeNotify($collector, new ProjectAssignmentNotification($project));
    }

    /**
     * @param  list<int>  $previousUserIds
     * @param  list<int>  $newUserIds
     */
    public function notifyNewlyAssignedCollectors(Project $project, array $previousUserIds, array $newUserIds): void
    {
        $previous = array_flip($previousUserIds);
        $added = array_values(array_filter($newUserIds, fn (int $id): bool => ! isset($previous[$id])));

        if ($added === []) {
            return;
        }

        $collectors = User::query()
            ->whereIn('id', $added)
            ->with('role')
            ->get();

        foreach ($collectors as $collector) {
            $this->notifyProjectAssignment($collector, $project);
        }
    }

    private function safeNotify(User $user, object $notification): void
    {
        try {
            $user->notify($notification);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
