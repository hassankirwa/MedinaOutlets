<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OutletResource;
use App\Models\Outlet;
use App\Models\ProjectWardAssignment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use App\Notifications\NewOutletSubmissionNotification;
use App\Notifications\OutletRejectedNotification;
use App\Services\NotificationRecipientResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OutletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Outlet::class);

        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('role');

        $query = Outlet::query()->with(['creator', 'ward', 'company']);

        $t = (new Outlet)->getTable();

        if ($user->role?->slug !== 'super_admin') {
            $query->where($t.'.company_id', $user->company_id);
        }

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
    public function photo(Outlet $outlet, int $index): \Symfony\Component\HttpFoundation\Response
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
            $hasActiveWardAssignment = ProjectWardAssignment::query()
                ->where('user_id', $user->id)
                ->whereHas('project', function (Builder $q) use ($user): void {
                    $q->whereIn('status', ['active', 'paused']);
                    if ($user->company_id !== null) {
                        $q->where('company_id', $user->company_id);
                    }
                })
                ->exists();

            if (! $hasActiveWardAssignment) {
                throw ValidationException::withMessages([
                    'facility_name' => __('You have no active projects open for outlet collection.'),
                ]);
            }
        }

        $data = $request->validate([
            'facility_name' => ['required', 'string', 'max:255'],
            'owner_name' => ['required', 'string', 'max:255'],
            'business_phone' => ['nullable', 'string', 'max:64'],
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
            'outlet_type' => ['nullable', 'string', 'max:64'],
            /** Mobile: stable id for idempotent create (retry after timeout vs offline sync). */
            'client_submission_key' => ['nullable', 'string', 'uuid'],
        ]);

        $outletType = $data['outlet_type'] ?? $this->inferOutletType(
            (string) ($data['selected_category'] ?? ''),
            (string) ($data['type_of_account'] ?? ''),
        );

        if ($user->role?->slug === 'field_collector' && ! empty($data['ward_id']) && $user->company_id !== null) {
            $allowed = ProjectWardAssignment::query()
                ->where('user_id', $user->id)
                ->where('ward_id', (int) $data['ward_id'])
                ->whereHas('project', function (Builder $q) use ($user): void {
                    $q->where('company_id', $user->company_id)
                        ->whereIn('status', ['active', 'paused']);
                })
                ->exists();
            if (! $allowed) {
                throw ValidationException::withMessages([
                    'ward_id' => __('Select a ward assigned to you for an active project.'),
                ]);
            }
        }

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

        try {
            $outlet = Outlet::query()->create([
                'company_id' => $user->company_id,
                'created_by' => $user->id,
                'client_submission_key' => $clientKey,
                'ward_id' => $data['ward_id'] ?? null,
                'facility_name' => $data['facility_name'],
                'outlet_type' => $outletType,
                'owner_name' => $data['owner_name'],
                'business_phone' => $data['business_phone'] ?? null,
                'email' => $data['email'] ?? null,
                'physical_location' => $data['physical_location'],
                'landmark' => $data['landmark'] ?? null,
                'latitude' => $data['latitude'],
                'longitude' => $data['longitude'],
                'gps_accuracy_meters' => $data['gps_accuracy_meters'] ?? null,
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

        $outlet->load(['creator', 'ward', 'company']);

        if ($outlet->company) {
            $resolver = app(NotificationRecipientResolver::class);
            foreach ($resolver->recipientsPreferring($outlet->company, 'new_submission') as $recipient) {
                $recipient->notify(new NewOutletSubmissionNotification($outlet));
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
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
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

        return (new OutletResource($outlet))->response();
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
