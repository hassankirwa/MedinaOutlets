<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OutletResource;
use App\Models\Outlet;
use App\Models\Project;
use App\Models\ProjectFieldWorker;
use App\Models\ProjectWardAssignment;
use App\Models\User;
use App\Models\Ward;
use App\Services\BranchCoverageValidator;
use App\Services\ReverseGeocodingService;
use App\Notifications\NewOutletSubmissionNotification;
use App\Notifications\OutletRejectedNotification;
use App\Services\CollectorNotificationService;
use App\Services\NotificationRecipientResolver;
use App\Support\DuplicateOutletSubmissionGuard;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class OutletController extends Controller
{
    public function __construct(
        private readonly BranchCoverageValidator $coverageValidator,
        private readonly ReverseGeocodingService $geocoding,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Outlet::class);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $query = Outlet::query()->with(['creator', 'ward', 'company', 'branch', 'county', 'project']);

        $t = (new Outlet)->getTable();

        if ($user->role?->slug !== 'super_admin') {
            $query->where($t.'.company_id', $user->company_id);
        }

        foreach (['status', 'ward_id', 'project_id', 'branch_id', 'county_id', 'created_by', 'outlet_type'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($t.'.'.$filter, $request->input($filter));
            }
        }

        if ($request->filled('captured_county')) {
            $query->where($t.'.captured_county', 'like', '%'.$request->string('captured_county').'%');
        }

        if ($request->filled('captured_ward')) {
            $query->where($t.'.captured_ward', 'like', '%'.$request->string('captured_ward').'%');
        }

        if ($request->filled('search')) {
            $s = '%'.$request->string('search').'%';
            $query->where(function (Builder $q) use ($s, $t): void {
                $q->where($t.'.facility_name', 'like', $s)
                    ->orWhere($t.'.owner_name', 'like', $s)
                    ->orWhere($t.'.business_phone', 'like', $s);
            });
        }

        if ($request->boolean('has_gps')) {
            $query->whereNotNull($t.'.latitude')->whereNotNull($t.'.longitude');
        }
        if ($request->boolean('has_photos')) {
            $query->whereNotNull($t.'.photos');
        }

        if ($request->filled('from')) {
            $query->whereDate($t.'.created_at', '>=', $request->date('from')->format('Y-m-d'));
        }

        if ($request->filled('to')) {
            $query->whereDate($t.'.created_at', '<=', $request->date('to')->format('Y-m-d'));
        }

        $outlets = $query->orderByDesc('created_at')->limit(500)->get();

        return OutletResource::collection($outlets)->response();
    }

    /**
     * Outlets created by the authenticated field collector (mobile "My submissions").
     */
    public function mySubmissions(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        if ($user->role?->slug !== 'field_collector' || $user->company_id === null) {
            abort(403, __('Only field collectors can list personal submissions.'));
        }

        $query = Outlet::query()->with(['creator', 'ward', 'company']);

        $t = (new Outlet)->getTable();
        $query->where($t.'.created_by', $user->id);

        if ($request->filled('status')) {
            $query->where($t.'.status', $request->string('status'));
        }

        if ($request->filled('ward_id')) {
            $query->where($t.'.ward_id', $request->integer('ward_id'));
        }

        if ($request->filled('from')) {
            $query->whereDate($t.'.created_at', '>=', $request->date('from')->format('Y-m-d'));
        }

        if ($request->filled('to')) {
            $query->whereDate($t.'.created_at', '<=', $request->date('to')->format('Y-m-d'));
        }

        $outlets = $query->orderByDesc('created_at')->limit(500)->get();

        return OutletResource::collection($outlets)->response();
    }

    /**
     * Stream a stored outlet photo; requires permission to view the outlet (RBAC).
     */
    public function photo(Outlet $outlet, int $index): Response
    {
        $this->authorize('view', $outlet);

        $paths = $outlet->listPhotoPublicDiskPaths();

        if (! array_key_exists($index, $paths)) {
            abort(404);
        }

        return Storage::disk('public')->response($paths[$index], headers: [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Outlet::class);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        if ($user->role?->slug === 'field_collector') {
            $hasActiveAssignment = ProjectFieldWorker::query()
                ->where('field_worker_id', $user->id)
                ->where('status', 'active')
                ->whereHas('project', function (Builder $q) use ($user): void {
                    $q->whereIn('status', ['active', 'paused']);
                    if ($user->company_id !== null) {
                        $q->where('company_id', $user->company_id);
                    }
                })
                ->exists()
                || ProjectWardAssignment::query()
                    ->where('user_id', $user->id)
                    ->whereHas('project', function (Builder $q) use ($user): void {
                        $q->whereIn('status', ['active', 'paused']);
                        if ($user->company_id !== null) {
                            $q->where('company_id', $user->company_id);
                        }
                    })
                    ->exists();

            if (! $hasActiveAssignment) {
                throw ValidationException::withMessages([
                    'facility_name' => __('You have no active projects open for outlet collection.'),
                ]);
            }
        }

        $data = $request->validate([
            'facility_name' => ['required', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'],
            'business_phone' => [
                $user->role?->slug === 'field_collector' ? 'required' : 'nullable',
                'string',
                'max:64',
            ],
            'alternative_phone' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'physical_location' => ['required', 'string'],
            'landmark' => ['nullable', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'gps_accuracy_meters' => ['nullable', 'integer', 'min:0', 'max:99999'],
            'type_of_account' => ['nullable', 'string', 'max:64'],
            'medical_facility_status' => ['nullable', 'string', 'max:64'],
            'outlet_serviced_by_med' => ['nullable', 'string', 'max:32'],
            'selected_category' => ['nullable', 'string', 'max:128'],
            'remarks' => ['nullable', 'string'],
            'photos' => ['nullable', 'array'],
            'photos.*' => ['nullable', 'array'],
            /** Mobile multipart: actual image binaries (local file URIs in JSON are not usable server-side). */
            'photo_files' => ['nullable', 'array'],
            'photo_files.*' => ['file', 'image', 'max:12288'],
            'ward_id' => ['nullable', 'exists:wards,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'county_id' => ['nullable', 'exists:counties,id'],
            'questionnaire_id' => ['nullable', 'exists:questionnaires,id'],
            'captured_place_name' => ['nullable', 'string', 'max:500'],
            'reverse_geocoded_address' => ['nullable', 'string'],
            'captured_address' => ['nullable', 'string'],
            'road' => ['nullable', 'string', 'max:255'],
            'suburb' => ['nullable', 'string', 'max:255'],
            'captured_ward' => ['nullable', 'string', 'max:255'],
            'captured_county' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'outlet_type' => ['nullable', 'string', 'max:64'],
            /** Mobile: stable id for idempotent create (retry after timeout vs offline sync). */
            'client_submission_key' => ['nullable', 'string', 'uuid'],
        ]);

        $outletType = $data['outlet_type'] ?? $this->inferOutletType(
            (string) ($data['selected_category'] ?? ''),
            (string) ($data['type_of_account'] ?? ''),
        );

        if ($user->role?->slug === 'field_collector' && $user->company_id !== null) {
            $this->validateFieldCollectorSubmission($user, $data);
        }

        $locationFields = $this->resolveLocationFields($data);

        $branchId = $data['branch_id'] ?? null;
        if (! empty($data['project_id'])) {
            $projectBranchId = Project::query()->where('id', (int) $data['project_id'])->value('branch_id');
            if ($projectBranchId !== null) {
                $branchId = (int) $projectBranchId;
            }
        }

        $countyId = $data['county_id'] ?? null;
        if ($countyId === null && ! empty($data['ward_id'])) {
            $countyId = Ward::query()->where('id', (int) $data['ward_id'])->value('county_id');
        }

        $capturedPlace = $locationFields['captured_place_name']
            ?? $this->buildCapturedPlaceFromFields($locationFields)
            ?? $data['physical_location']
            ?? ($data['landmark'] ?? null);

        $photosPayload = $this->normalizeOutletPhotosPayload($request, $data['photos'] ?? null);

        $clientKey = isset($data['client_submission_key']) && $data['client_submission_key'] !== ''
            ? (string) $data['client_submission_key']
            : null;

        if ($clientKey !== null) {
            $existing = Outlet::query()
                ->where('created_by', $user->id)
                ->where('client_submission_key', $clientKey)
                ->first();
            if ($existing) {
                $existing->load(['creator', 'ward', 'company']);

                return (new OutletResource($existing))->response()->setStatusCode(200);
            }
        }

        DuplicateOutletSubmissionGuard::assertNotDuplicate(
            $user,
            $data['facility_name'],
            (float) $data['latitude'],
            (float) $data['longitude'],
        );

        try {
            $outlet = Outlet::query()->create([
                'company_id' => $user->company_id,
                'project_id' => $data['project_id'] ?? null,
                'branch_id' => $branchId,
                'county_id' => $countyId,
                'questionnaire_id' => $data['questionnaire_id'] ?? null,
                'created_by' => $user->id,
                'client_submission_key' => $clientKey,
                'ward_id' => $data['ward_id'] ?? null,
                'facility_name' => $data['facility_name'],
                'outlet_type' => $outletType,
                'owner_name' => $data['owner_name'],
                'business_phone' => $data['business_phone'] ?? null,
                'alternative_phone' => $data['alternative_phone'] ?? null,
                'email' => $data['email'] ?? null,
                'physical_location' => $data['physical_location'],
                'landmark' => $locationFields['landmark'] ?? $data['landmark'] ?? null,
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'gps_accuracy_meters' => $data['gps_accuracy_meters'] ?? null,
                'captured_place_name' => $capturedPlace,
                'reverse_geocoded_address' => $locationFields['reverse_geocoded_address'],
                'captured_address' => $locationFields['captured_address'],
                'road' => $locationFields['road'],
                'suburb' => $locationFields['suburb'],
                'captured_ward' => $locationFields['captured_ward'],
                'captured_county' => $locationFields['captured_county'],
                'region' => $locationFields['region'],
                'country' => $locationFields['country'],
                'type_of_account' => $data['type_of_account'] ?? null,
                'medical_facility_status' => $data['medical_facility_status'] ?? null,
                'outlet_serviced_by_med' => $data['outlet_serviced_by_med'] ?? null,
                'selected_category' => $data['selected_category'] ?? null,
                'remarks' => $data['remarks'] ?? null,
                'photos' => $photosPayload,
                'status' => 'pending',
            ]);
        } catch (QueryException $e) {
            if ($clientKey !== null) {
                $existing = Outlet::query()
                    ->where('created_by', $user->id)
                    ->where('client_submission_key', $clientKey)
                    ->first();
                if ($existing) {
                    $existing->load(['creator', 'ward', 'company']);

                    return (new OutletResource($existing))->response()->setStatusCode(200);
                }
            }

            throw $e;
        }

        $outlet->load(['creator', 'ward', 'company', 'branch', 'county', 'project']);

        if ($outlet->company) {
            $resolver = app(NotificationRecipientResolver::class);
            foreach ($resolver->recipientsPreferring($outlet->company, 'new_submission') as $recipient) {
                try {
                    $recipient->notify(new NewOutletSubmissionNotification($outlet));
                } catch (Throwable $e) {
                    report($e);
                }
            }
        }

        return (new OutletResource($outlet))->response()->setStatusCode(201);
    }

    /**
     * Prefer multipart `photo_files` uploads; otherwise keep JSON `photos` when entries carry usable URLs/paths.
     *
     * @param  array<int, mixed>|null  $jsonPhotos
     * @return array<int, array<string, string>>|null
     */
    private function normalizeOutletPhotosPayload(Request $request, ?array $jsonPhotos): ?array
    {
        $uploaded = $request->file('photo_files');
        if ($uploaded !== null) {
            $files = is_array($uploaded) ? $uploaded : [$uploaded];
            $stored = [];
            foreach ($files as $file) {
                if ($file instanceof UploadedFile && $file->isValid()) {
                    $stored[] = ['path' => $file->store('outlet-photos', 'public')];
                }
            }

            return $stored === [] ? null : $stored;
        }

        return $jsonPhotos;
    }

    public function show(Request $request, Outlet $outlet): JsonResponse
    {
        $this->authorize('view', $outlet);

        $outlet->load(['creator', 'ward', 'company']);

        return (new OutletResource($outlet))->response();
    }

    public function update(Request $request, Outlet $outlet): JsonResponse
    {
        $this->authorize('update', $outlet);

        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'needs_correction'])],
        ]);

        $previousStatus = $outlet->status;

        $outlet->update(['status' => $data['status']]);
        $outlet->load(['creator', 'ward', 'company']);

        if (
            $data['status'] === 'rejected'
            && $previousStatus !== 'rejected'
            && $outlet->company
        ) {
            $resolver = app(NotificationRecipientResolver::class);
            foreach ($resolver->recipientsPreferring($outlet->company, 'rejected_submission') as $recipient) {
                $recipient->notify(new OutletRejectedNotification($outlet));
            }
        }

        app(CollectorNotificationService::class)->notifySubmissionReviewed(
            $outlet,
            $data['status'],
            $previousStatus,
        );

        return (new OutletResource($outlet))->response();
    }

    /**
     * Apply the same status review rules as {@see update()} to many outlets at once (company scope enforced per row).
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $data = $request->validate([
            'outlet_ids' => ['required', 'array', 'min:1', 'max:500'],
            'outlet_ids.*' => ['integer', 'exists:outlets,id'],
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'needs_correction'])],
        ]);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $ids = array_values(array_unique(array_map(intval(...), $data['outlet_ids'])));
        $status = $data['status'];

        $outlets = Outlet::query()->whereIn('id', $ids)->get();

        if ($outlets->count() !== count($ids)) {
            abort(422, __('One or more outlets are invalid.'));
        }

        foreach ($outlets as $outlet) {
            $this->authorize('update', $outlet);
        }

        $resolver = app(NotificationRecipientResolver::class);
        $collectorNotifier = app(CollectorNotificationService::class);

        DB::transaction(function () use ($outlets, $status, $resolver, $collectorNotifier): void {
            foreach ($outlets as $outlet) {
                $previousStatus = $outlet->status;
                $outlet->update(['status' => $status]);

                if (
                    $status === 'rejected'
                    && $previousStatus !== 'rejected'
                    && $outlet->company
                ) {
                    $outlet->refresh();
                    $outlet->load(['creator', 'ward', 'company']);
                    foreach ($resolver->recipientsPreferring($outlet->company, 'rejected_submission') as $recipient) {
                        $recipient->notify(new OutletRejectedNotification($outlet));
                    }
                }

                $outlet->refresh();
                $outlet->load(['creator', 'ward', 'company']);
                $collectorNotifier->notifySubmissionReviewed($outlet, $status, $previousStatus);
            }
        });

        $updated = Outlet::query()
            ->whereIn('id', $ids)
            ->with(['creator', 'ward', 'company'])
            ->orderByDesc('created_at')
            ->get();

        return OutletResource::collection($updated)->response();
    }

    /**
     * Permanently delete many outlets (company scope enforced per row).
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'outlet_ids' => ['required', 'array', 'min:1', 'max:500'],
            'outlet_ids.*' => ['integer', 'exists:outlets,id'],
        ]);

        $ids = array_values(array_unique(array_map(intval(...), $data['outlet_ids'])));

        $outlets = Outlet::query()->whereIn('id', $ids)->get();

        if ($outlets->count() !== count($ids)) {
            abort(422, __('One or more outlets are invalid.'));
        }

        foreach ($outlets as $outlet) {
            $this->authorize('delete', $outlet);
        }

        DB::transaction(function () use ($outlets): void {
            foreach ($outlets as $outlet) {
                foreach ($outlet->listPhotoPublicDiskPaths() as $path) {
                    Storage::disk('public')->delete($path);
                }
                $outlet->delete();
            }
        });

        return response()->json([
            'deleted' => count($ids),
            'outlet_ids' => $ids,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validateFieldCollectorSubmission(User $user, array $data): void
    {
        $projectId = isset($data['project_id']) ? (int) $data['project_id'] : null;

        if ($projectId === null) {
            throw ValidationException::withMessages([
                'project_id' => __('Project is required for field collector submissions.'),
            ]);
        }

        $project = Project::query()
            ->where('id', $projectId)
            ->where('company_id', $user->company_id)
            ->whereIn('status', ['active', 'paused'])
            ->first();

        if ($project === null) {
            throw ValidationException::withMessages([
                'project_id' => __('Select an active project.'),
            ]);
        }

        $allowed = ProjectFieldWorker::query()
            ->where('project_id', $projectId)
            ->where('field_worker_id', $user->id)
            ->where('status', 'active')
            ->exists()
            || ProjectWardAssignment::query()
                ->where('user_id', $user->id)
                ->where('project_id', $projectId)
                ->exists();

        if (! $allowed) {
            throw ValidationException::withMessages([
                'project_id' => __('You are not assigned to this project.'),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, string|null>
     */
    private function resolveLocationFields(array $data): array
    {
        $fields = [
            'captured_address' => $data['captured_address'] ?? null,
            'road' => $data['road'] ?? null,
            'suburb' => $data['suburb'] ?? null,
            'captured_ward' => $data['captured_ward'] ?? null,
            'captured_county' => $data['captured_county'] ?? null,
            'region' => $data['region'] ?? null,
            'country' => $data['country'] ?? null,
            'reverse_geocoded_address' => $data['reverse_geocoded_address'] ?? null,
            'captured_place_name' => $data['captured_place_name'] ?? null,
            'landmark' => $this->nullableString($data['landmark'] ?? null),
        ];

        $hasCaptured = collect($fields)->except(['reverse_geocoded_address', 'captured_place_name', 'landmark'])
            ->filter(fn ($v) => is_string($v) && trim($v) !== '')
            ->isNotEmpty();

        $needsGeocode = (! $hasCaptured || $fields['landmark'] === null) && isset($data['latitude'], $data['longitude']);

        if ($needsGeocode) {
            try {
                $geocoded = $this->geocoding->reverse((float) $data['latitude'], (float) $data['longitude']);
                foreach ($geocoded as $key => $value) {
                    if (($fields[$key] ?? null) === null && is_string($value) && trim($value) !== '') {
                        $fields[$key] = trim($value);
                    }
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $fields;
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * @param  array<string, string|null>  $fields
     */
    private function buildCapturedPlaceFromFields(array $fields): ?string
    {
        $parts = array_values(array_filter([
            $fields['landmark'] ?? null,
            $fields['road'] ?? null,
            $fields['suburb'] ?? null,
            $fields['captured_ward'] ?? null,
            $fields['captured_county'] ?? null,
            $fields['country'] ?? null,
        ], fn ($v) => is_string($v) && trim($v) !== ''));

        return $parts === [] ? null : implode(', ', $parts);
    }

    private function inferOutletType(string $category, string $accountType): string
    {
        $hay = strtoupper($category.' '.$accountType);

        if (str_contains($hay, 'PHARMACY')) {
            return 'Pharmacy';
        }
        if (str_contains($hay, 'CLINIC') || str_contains($hay, 'DISPENSARY')) {
            return 'Clinic / Dispensary';
        }
        if (str_contains($hay, 'AGROVET') || str_contains($hay, 'AGRO')) {
            return 'Agrovet';
        }
        if (str_contains($hay, 'HOSPITAL')) {
            return 'Hospital';
        }

        return 'Shop';
    }
}
