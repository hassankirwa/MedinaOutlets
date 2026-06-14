<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ReportGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportGenerationService $reports,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json(['reports' => $this->reports->listReportTypes()]);
    }

    public function generate(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $type = $request->string('type')->toString();
        $filters = $this->reports->filtersFromRequest($request);

        return response()->json($this->reports->generate($user, $type, $filters));
    }

    public function export(Request $request): BinaryFileResponse|StreamedResponse
    {
        /** @var User $user */
        $user = $request->user();
        $type = $request->string('type')->toString();
        $format = strtolower((string) $request->query('format', 'csv'));
        $filters = $this->reports->filtersFromRequest($request);

        return $this->reports->export($user, $type, $format, $filters);
    }
}
