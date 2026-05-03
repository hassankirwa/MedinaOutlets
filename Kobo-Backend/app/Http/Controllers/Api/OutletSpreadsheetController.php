<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use App\Models\User;
use App\Services\OutletSpreadsheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OutletSpreadsheetController extends Controller
{
    public function __construct(
        private readonly OutletSpreadsheetService $spreadsheet,
    ) {}

    public function template(Request $request): BinaryFileResponse|StreamedResponse
    {
        $this->authorize('viewAny', Outlet::class);

        $format = strtolower((string) $request->query('format', 'csv'));

        return $this->spreadsheet->downloadTemplate($format);
    }

    public function export(Request $request): BinaryFileResponse|StreamedResponse
    {
        $this->authorize('viewAny', Outlet::class);

        /** @var User $user */
        $user = $request->user();
        $format = strtolower((string) $request->query('format', 'csv'));

        return $this->spreadsheet->exportOutlets($user, $format);
    }

    public function import(Request $request): JsonResponse
    {
        $this->authorize('create', Outlet::class);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        if (! in_array($user->role?->slug, ['super_admin', 'company_admin', 'qa_officer'], true)) {
            abort(403, __('Only administrators can import submissions.'));
        }

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:51200'],
        ]);

        /** @var UploadedFile $file */
        $file = $validated['file'];

        $result = $this->spreadsheet->importOutlets($user, $file);

        return response()->json($result);
    }
}
