<?php

namespace App\Notifications;

use App\Models\Company;
use App\Notifications\Concerns\BuildsFrontendLinks;
use Illuminate\Notifications\Messages\MailMessage;

class WeeklySummaryNotification extends BaseWorkspaceNotification
{
    use BuildsFrontendLinks;

    /**
     * @param  array<string, int|string>  $stats
     */
    public function __construct(
        public Company $company,
        public array $stats = []
    ) {}

    protected function preferenceKey(): string
    {
        return 'weekly_summary';
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        $path = '/admin/dashboard';
        $pending = (int) ($this->stats['pending_outlets'] ?? 0);
        $body = sprintf(
            'Weekly summary for %s: %d pending submissions.',
            $this->company->name,
            $pending
        );

        return [
            'title' => 'Weekly summary',
            'body' => $body,
            'action_path' => $path,
            'page_key' => 'dashboard',
            'entity_type' => 'company',
            'entity_id' => (string) $this->company->id,
            'stats' => $this->stats,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $pending = (int) ($this->stats['pending_outlets'] ?? 0);

        return (new MailMessage)
            ->subject('Weekly operational summary')
            ->line('Organization: '.$this->company->name)
            ->line('Pending submissions this period: '.$pending)
            ->action('Open dashboard', $this->frontendAbsolute('/admin/dashboard'));
    }
}
