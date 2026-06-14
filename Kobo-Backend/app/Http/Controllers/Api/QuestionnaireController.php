<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Questionnaire;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuestionnaireController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Questionnaire::query()->where('status', 'active');

        if ($user->role?->slug !== 'super_admin') {
            $query->where(function ($q) use ($user): void {
                $q->whereNull('company_id')
                    ->orWhere('company_id', $user->company_id);
            });
        }

        $rows = $query->orderBy('name')->get()->map(fn (Questionnaire $q): array => [
            'id' => (string) $q->id,
            'name' => $q->name,
            'description' => $q->description,
            'status' => $q->status,
        ]);

        return response()->json(['questionnaires' => $rows]);
    }

    public function show(Questionnaire $questionnaire): JsonResponse
    {
        return response()->json([
            'questionnaire' => [
                'id' => (string) $questionnaire->id,
                'name' => $questionnaire->name,
                'description' => $questionnaire->description,
                'schema_json' => $questionnaire->schema_json,
                'status' => $questionnaire->status,
                'created_at' => $questionnaire->created_at?->toIso8601String(),
            ],
        ]);
    }
}
