<?php

namespace App\Notifications;

use App\Models\Outlet;

class SubmissionReviewedNotification extends BaseCollectorNotification
{
    public function __construct(
        public Outlet $outlet,
        public string $reviewStatus,
    ) {}

    protected function preferenceKey(): string
    {
        return 'submission_review';
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $name = $this->outlet->facility_name ?? 'Outlet #'.$this->outlet->id;

        [$title, $body] = match ($this->reviewStatus) {
            'approved' => [
                'Submission approved',
                $name.' was approved.',
            ],
            'rejected' => [
                'Submission rejected',
                $name.' was rejected. Tap to view details.',
            ],
            'needs_correction' => [
                'Submission needs correction',
                $name.' needs updates before it can be approved.',
            ],
            default => [
                'Submission updated',
                $name.' review status changed.',
            ],
        };

        return [
            'title' => $title,
            'body' => $body,
            'action_path' => '/admin/submissions/'.$this->outlet->id,
            'page_key' => 'submissions',
            'entity_type' => 'outlet',
            'entity_id' => (string) $this->outlet->id,
            'mobile_screen' => 'submission_details',
            'mobile_params' => [
                'outlet_id' => (string) $this->outlet->id,
            ],
        ];
    }
}
