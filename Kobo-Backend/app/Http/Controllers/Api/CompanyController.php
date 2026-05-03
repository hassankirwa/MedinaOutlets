<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    /**
     * List companies (super admin only) — used when inviting field workers to pick workspace.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401);
        if ($user->role?->slug !== 'super_admin') {
            abort(403);
        }

        $rows = Company::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $rows]);
    }
}
