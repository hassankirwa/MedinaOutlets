<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class NotificationFeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        /** @var LengthAwarePaginator<int, \Illuminate\Notifications\DatabaseNotification> $page */
        $page = $user->notifications()->latest()->paginate(perPage: (int) $request->integer('per_page', 30));

        $data = $page->getCollection()->map(function (\Illuminate\Notifications\DatabaseNotification $n): array {
            /** @var array<string, mixed> $payload */
            $payload = $n->data;

            return [
                'id' => $n->id,
                'type' => $n->type,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
                'title' => $payload['title'] ?? '',
                'body' => $payload['body'] ?? '',
                'action_path' => $payload['action_path'] ?? null,
                'page_key' => $payload['page_key'] ?? null,
                'entity_type' => $payload['entity_type'] ?? null,
                'entity_id' => $payload['entity_id'] ?? null,
                'mobile_screen' => $payload['mobile_screen'] ?? null,
                'mobile_params' => $payload['mobile_params'] ?? null,
            ];
        })->values()->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = $request->user()->unreadNotifications()->count();

        return response()->json(['count' => $count]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['message' => 'Marked read']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All marked read']);
    }

    public function clearAll(Request $request): JsonResponse
    {
        $request->user()->notifications()->delete();

        return response()->json(['message' => 'Notifications cleared']);
    }
}
