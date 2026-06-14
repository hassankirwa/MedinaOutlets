<?php

namespace App\Notifications\Channels;

use App\Models\DeviceToken;
use App\Models\User;
use App\Notifications\Concerns\SendsExpoPush;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class ExpoPushChannel
{
    use SendsExpoPush;

    public function send(object $notifiable, Notification $notification): void
    {
        if (! $notifiable instanceof User) {
            return;
        }

        if (! method_exists($notification, 'toExpoPush')) {
            return;
        }

        $prefs = $notifiable->resolvedNotificationPreferences();
        /** @var array<string, bool> $channels */
        $channels = $prefs['channels'] ?? [];
        if (! ($channels['push'] ?? false)) {
            return;
        }

        /** @var array<string, mixed>|null $payload */
        $payload = $notification->toExpoPush($notifiable);
        if ($payload === null) {
            return;
        }

        $tokens = DeviceToken::query()
            ->where('user_id', $notifiable->id)
            ->pluck('expo_push_token')
            ->all();

        if ($tokens === []) {
            return;
        }

        $messages = [];
        foreach ($tokens as $token) {
            $messages[] = $this->buildExpoMessage($token, $payload);
        }

        $this->dispatchExpoMessages($messages, $notifiable->id);
    }
}
