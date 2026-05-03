<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CountyResource;
use App\Http\Resources\WardResource;
use App\Models\County;
use Illuminate\Http\JsonResponse;

class CountyController extends Controller
{
    public function index(): JsonResponse
    {
        $counties = County::query()
            ->withCount('wards')
            ->orderBy('name')
            ->get();

        return CountyResource::collection($counties)->response();
    }

    public function show(County $county): JsonResponse
    {
        $county->load(['wards' => fn ($q) => $q->orderBy('name')]);

        return response()->json([
            'county' => new CountyResource($county),
            'wards' => WardResource::collection($county->wards),
        ]);
    }
}
