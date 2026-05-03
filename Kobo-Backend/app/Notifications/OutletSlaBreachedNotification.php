<?php

namespace App\Notifications;

use App\Models\Outlet;
use App\Notifications\Concerns\BuildsFrontendLinks;
use Illuminate\Notifications\Messages\MailMessage;

class OutletSlaBreachedNotification extends BaseWorkspaceNotification
{
    use BuildsFrontendLinks;

    public function __construct(
        public Outlet $outlet
    ) {}

    protected function preferenceKey(): string
    {
        return 'sla_breach';
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $path = '/admin/submissions/'.$this->outlet->id;

        return [
            'title' => 'Approval SLA exceeded',
            'body' => 'A submission has been pending beyond the SLA: '.($this->outlet->facility_name ?? 'Outlet #'.$this->outlet->id),
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
            ->subject('Pending approval over SLA')
            ->line('A submission has been pending beyond the configured SLA: '.($this->outlet->facility_name ?? 'Outlet #'.$this->outlet->id))
            ->action('Review submission', $this->frontendAbsolute($path));
    }
}
