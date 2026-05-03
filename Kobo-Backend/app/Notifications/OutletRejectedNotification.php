<?php

namespace App\Notifications;

use App\Models\Outlet;
use App\Notifications\Concerns\BuildsFrontendLinks;
use Illuminate\Notifications\Messages\MailMessage;

class OutletRejectedNotification extends BaseWorkspaceNotification
{
    use BuildsFrontendLinks;

    public function __construct(
        public Outlet $outlet
    ) {}

    protected function preferenceKey(): string
    {
        return 'rejected_submission';
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $path = '/admin/submissions/'.$this->outlet->id;

        return [
            'title' => 'Submission rejected',
            'body' => 'An outlet submission was rejected: '.($this->outlet->facility_name ?? 'Outlet #'.$this->outlet->id),
            'action_path' => $path,
            'page_key' => 'submissions',
            'entity_type' => 'outlet',
            'entity_id' => (string) $this->outlet->id,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $path = '/admin/submissions/'.$this->outlet->id;

        return (new MailMessage)
            ->subject('Outlet submission rejected')
            ->line('An outlet submission was rejected: '.($this->outlet->facility_name ?? 'Outlet #'.$this->outlet->id))
            ->action('View submission', $this->frontendAbsolute($path));
    }
}
