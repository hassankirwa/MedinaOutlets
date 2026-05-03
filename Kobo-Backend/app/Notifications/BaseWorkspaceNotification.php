<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Notification;

abstract class BaseWorkspaceNotification extends Notification
{
    /**
     * @return 'new_submission'|'sla_breach'|'rejected_submission'|'weekly_summary'
     */
    abstract protected function preferenceKey(): string;

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        if (! $notifiable instanceof User) {
            return [];
        }

        $prefs = $notifiable->resolvedNotificationPreferences();
        $key = $this->preferenceKey();

        if (! ($prefs[$key] ?? false)) {
            return [];
        }

        /** @var array<string, bool> $channels */
        $channels = $prefs['channels'] ?? [];
        $out = [];

        if ($channels['in_app'] ?? true) {
            $out[] = 'database';
        }

        if ($channels['email'] ?? true) {
            $out[] = 'mail';
        }

        return $out;
    }
}
