<?php

namespace App\Notifications;

use App\Models\User;
use App\Notifications\Channels\ExpoPushChannel;
use Illuminate\Notifications\Notification;

abstract class BaseCollectorNotification extends Notification
{
    /**
     * @return 'submission_review'|'project_assignment'
     */
    abstract protected function preferenceKey(): string;

    /**
     * @return list<string|class-string>
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

        if ($channels['push'] ?? false) {
            $out[] = ExpoPushChannel::class;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function toExpoPush(object $notifiable): ?array
    {
        /** @var array<string, mixed> $db */
        $db = $this->toDatabase($notifiable);

        return [
            'title' => $db['title'] ?? '',
            'body' => $db['body'] ?? '',
            'data' => [
                'mobile_screen' => $db['mobile_screen'] ?? null,
                'mobile_params' => $db['mobile_params'] ?? [],
                'entity_type' => $db['entity_type'] ?? null,
                'entity_id' => $db['entity_id'] ?? null,
            ],
        ];
    }
}
