<?php

namespace App\Notifications\Concerns;

use App\Models\DeviceToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

trait SendsExpoPush
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function buildExpoMessage(string $expoPushToken, array $payload): array
    {
        $message = [
            'to' => $expoPushToken,
            'sound' => 'default',
            'title' => (string) ($payload['title'] ?? ''),
            'body' => (string) ($payload['body'] ?? ''),
        ];

        $data = $payload['data'] ?? null;
        if (is_array($data) && $data !== []) {
            $message['data'] = $data;
        }

        return $message;
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     */
    protected function dispatchExpoMessages(array $messages, int $userId): void
    {
        if ($messages === []) {
            return;
        }

        try {
            $response = Http::acceptJson()
                ->post('https://exp.host/--/api/v2/push/send', $messages);

            if (! $response->successful()) {
                Log::warning('Expo push request failed', [
                    'user_id' => $userId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return;
            }

            /** @var array<string, mixed> $body */
            $body = $response->json();
            $tickets = $body['data'] ?? [];
            if (! is_array($tickets)) {
                return;
            }

            $invalidTokens = [];
            foreach ($tickets as $index => $ticket) {
                if (! is_array($ticket)) {
                    continue;
                }
                $status = $ticket['status'] ?? null;
                if ($status === 'error') {
                    $details = $ticket['details'] ?? [];
                    $error = is_array($details) ? ($details['error'] ?? null) : null;
                    if ($error === 'DeviceNotRegistered' && isset($messages[$index]['to'])) {
                        $invalidTokens[] = (string) $messages[$index]['to'];
                    }
                }
            }

            if ($invalidTokens !== []) {
                DeviceToken::query()->whereIn('expo_push_token', $invalidTokens)->delete();
            }
        } catch (\Throwable $e) {
            Log::warning('Expo push dispatch error', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
