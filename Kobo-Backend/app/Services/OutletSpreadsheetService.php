<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\User;
use App\Support\DuplicateOutletSubmissionGuard;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class OutletSpreadsheetService
{
    /** Column keys for template & import (snake_case). */
    public const IMPORT_HEADERS = [
        'facility_name',
        'outlet_type',
        'owner_name',
        'business_phone',
        'email',
        'physical_location',
        'landmark',
        'latitude',
        'longitude',
        'gps_accuracy_meters',
        'type_of_account',
        'medical_facility_status',
        'outlet_serviced_by_med',
        'selected_category',
        'remarks',
        'ward_id',
        'status',
        'image_urls',
    ];

    private const MAX_IMPORT_ROWS = 500;

    public function downloadTemplate(string $format): BinaryFileResponse|StreamedResponse
    {
        $format = strtolower($format);
        $headers = self::IMPORT_HEADERS;

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($headers): void {
                $out = fopen('php://output', 'w');
                if ($out === false) {
                    return;
                }
                fwrite($out, "\xEF\xBB\xBF");
                fputcsv($out, $headers);
                fclose($out);
            }, 'outlet-import-template.csv', [
                'Content-Type' => 'text/csv; charset=UTF-8',
            ]);
        }

        if ($format === 'xlsx') {
            if (! $this->zipExtensionLoaded()) {
                return $this->streamExcel2003Xml([$headers], 'outlet-import-template.xls', 'Import');
            }

            $tmp = tempnam(sys_get_temp_dir(), 'tpl');
            if ($tmp === false) {
                abort(500, 'Could not create temp file.');
            }
            $writer = new XlsxWriter;
            $writer->openToFile($tmp);
            $writer->getCurrentSheet()->setName('Import');
            $writer->addRow(Row::fromValues($headers));
            $writer->close();

            return response()->download($tmp, 'outlet-import-template.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])->deleteFileAfterSend(true);
        }

        abort(422, 'Invalid format. Use csv or xlsx.');
    }

    public function exportOutlets(User $user, string $format): BinaryFileResponse|StreamedResponse
    {
        $format = strtolower($format);
        $outlets = $this->queryOutletsForExport($user);

        $exportHeaders = array_merge(['id'], self::IMPORT_HEADERS, ['created_at']);

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($outlets, $exportHeaders): void {
                $out = fopen('php://output', 'w');
                if ($out === false) {
                    return;
                }
                fwrite($out, "\xEF\xBB\xBF");
                fputcsv($out, $exportHeaders);
                foreach ($outlets as $o) {
                    fputcsv($out, $this->outletToExportValues($o));
                }
                fclose($out);
            }, 'outlets-export.csv', [
                'Content-Type' => 'text/csv; charset=UTF-8',
            ]);
        }

        if ($format === 'xlsx') {
            if (! $this->zipExtensionLoaded()) {
                $rows = [$exportHeaders];
                foreach ($outlets as $o) {
                    $rows[] = $this->outletToExportValues($o);
                }

                return $this->streamExcel2003Xml($rows, 'outlets-export.xls', 'Outlets');
            }

            $tmp = tempnam(sys_get_temp_dir(), 'exp');
            if ($tmp === false) {
                abort(500, 'Could not create temp file.');
            }
            $writer = new XlsxWriter;
            $writer->openToFile($tmp);
            $writer->getCurrentSheet()->setName('Outlets');
            $writer->addRow(Row::fromValues($exportHeaders));
            foreach ($outlets as $o) {
                $writer->addRow(Row::fromValues($this->outletToExportValues($o)));
            }
            $writer->close();

            return response()->download($tmp, 'outlets-export.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])->deleteFileAfterSend(true);
        }

        abort(422, 'Invalid format. Use csv or xlsx.');
    }

    /**
     * @return array{imported: int, errors: list<array{row: int, messages: list<string>}>}
     */
    public function importOutlets(User $user, UploadedFile $file): array
    {
        if ($user->company_id === null) {
            abort(403, __('Imports require a company workspace.'));
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: '');
        if (! in_array($ext, ['csv', 'xlsx'], true)) {
            throw ValidationException::withMessages([
                'file' => [__('Upload a .csv or .xlsx file.')],
            ]);
        }

        $tmpPath = $file->getRealPath();
        if ($tmpPath === false || ! is_readable($tmpPath)) {
            throw ValidationException::withMessages([
                'file' => [__('Could not read the uploaded file.')],
            ]);
        }

        if ($ext === 'xlsx' && ! $this->zipExtensionLoaded()) {
            throw ValidationException::withMessages([
                'file' => [__('Importing .xlsx files requires the PHP zip extension. Upload CSV instead, or enable ext-zip in PHP.')],
            ]);
        }

        $rows = $this->readRowsFromFile($tmpPath, $ext);
        if ($rows === []) {
            throw ValidationException::withMessages([
                'file' => [__('The file is empty.')],
            ]);
        }

        $headerRow = array_shift($rows);
        $columnMap = $this->mapImportHeaders($headerRow);

        $errors = [];
        $imported = 0;
        $rowNum = 2;

        foreach ($rows as $dataRow) {
            if ($this->rowIsBlank($dataRow)) {
                $rowNum++;

                continue;
            }

            if ($imported >= self::MAX_IMPORT_ROWS) {
                $errors[] = ['row' => $rowNum, 'messages' => [__('Stopped: maximum :n rows per import.', ['n' => self::MAX_IMPORT_ROWS])]];

                break;
            }

            $payload = $this->rowToPayload($dataRow, $columnMap);

            if ($this->rowLooksLikeTemplateHint($payload)) {
                $rowNum++;

                continue;
            }

            try {
                $this->createOutletFromImportRow($user, $payload);
                $imported++;
            } catch (ValidationException $e) {
                $messages = [];
                foreach ($e->errors() as $msgs) {
                    foreach ((array) $msgs as $m) {
                        $messages[] = (string) $m;
                    }
                }
                if ($messages === []) {
                    $messages[] = $e->getMessage();
                }
                $errors[] = ['row' => $rowNum, 'messages' => $messages];
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNum, 'messages' => [$e->getMessage()]];
            }

            $rowNum++;
        }

        return ['imported' => $imported, 'errors' => $errors];
    }

    /**
     * @return Collection<int, Outlet>
     */
    private function queryOutletsForExport(User $user): Collection
    {
        $query = Outlet::query()->with(['creator', 'ward', 'company']);

        $t = (new Outlet)->getTable();

        if ($user->role?->slug !== 'super_admin') {
            $query->where($t.'.company_id', $user->company_id);
        }

        return $query->orderByDesc('created_at')->limit(500)->get();
    }

    /**
     * @return list<string|int|float|null>
     */
    private function outletToExportValues(Outlet $o): array
    {
        $urls = $this->photoUrlsForExport($o);
        $imageUrls = implode('|', $urls);

        $row = [
            (string) $o->id,
            $o->facility_name,
            $o->outlet_type,
            $o->owner_name,
            $o->business_phone ?? '',
            $o->email ?? '',
            $o->physical_location,
            $o->landmark ?? '',
            $o->latitude,
            $o->longitude,
            $o->gps_accuracy_meters ?? '',
            $o->type_of_account ?? '',
            $o->medical_facility_status ?? '',
            $o->outlet_serviced_by_med ?? '',
            $o->selected_category ?? '',
            $o->remarks ?? '',
            $o->ward_id ?? '',
            $o->status,
            $imageUrls,
        ];

        $row[] = $o->created_at?->format('Y-m-d H:i:s') ?? '';

        return $row;
    }

    /**
     * @return list<string>
     */
    private function photoUrlsForExport(Outlet $o): array
    {
        $photos = $o->photos;
        if (! is_array($photos) || $photos === []) {
            return [];
        }
        $urls = [];
        foreach ($photos as $item) {
            if (is_string($item)) {
                if (str_starts_with($item, 'http://') || str_starts_with($item, 'https://')) {
                    $urls[] = $item;

                    continue;
                }
                $urls[] = Storage::disk('public')->url($item);

                continue;
            }
            if (is_array($item)) {
                $uri = $item['uri'] ?? null;
                if (is_string($uri) && (str_starts_with($uri, 'http://') || str_starts_with($uri, 'https://'))) {
                    $urls[] = $uri;

                    continue;
                }
                foreach (['path', 'storage_path', 'disk_path'] as $key) {
                    $path = $item[$key] ?? null;
                    if (is_string($path) && $path !== '') {
                        $urls[] = Storage::disk('public')->url($path);

                        break;
                    }
                }
            }
        }

        return array_values(array_filter($urls));
    }

    /**
     * @param  list<list<string|null>>  $rows
     */
    private function readRowsFromFile(string $path, string $ext): array
    {
        $rows = [];
        if ($ext === 'csv') {
            $reader = new CsvReader;
            $reader->open($path);
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $row) {
                    $cells = $row->getCells();
                    $vals = [];
                    foreach ($cells as $c) {
                        $vals[] = $this->cellToString($c);
                    }
                    $rows[] = $vals;
                }
            }
            $reader->close();
        } else {
            $reader = new XlsxReader;
            $reader->open($path);
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $row) {
                    $cells = $row->getCells();
                    $vals = [];
                    foreach ($cells as $c) {
                        $vals[] = $this->cellToString($c);
                    }
                    $rows[] = $vals;
                }

                break;
            }
            $reader->close();
        }

        return $rows;
    }

    private function cellToString(Cell $cell): ?string
    {
        $v = $cell->getValue();
        if ($v === null) {
            return null;
        }
        if (is_float($v) || is_int($v)) {
            return (string) $v;
        }
        if (is_string($v)) {
            return $v;
        }

        return null;
    }

    /**
     * @param  list<string|null>  $headerRow
     * @return array<int, string> index → canonical key
     */
    private function mapImportHeaders(array $headerRow): array
    {
        $map = [];
        foreach ($headerRow as $i => $raw) {
            $key = $this->canonicalHeaderKey((string) ($raw ?? ''));
            if ($key === null || $key === '') {
                continue;
            }
            if (! in_array($key, self::IMPORT_HEADERS, true)) {
                continue;
            }
            $map[$i] = $key;
        }

        $required = ['facility_name', 'owner_name', 'physical_location', 'latitude', 'longitude'];
        $found = array_values(array_unique(array_values($map)));
        foreach ($required as $req) {
            if (! in_array($req, $found, true)) {
                throw ValidationException::withMessages([
                    'file' => [__('Missing required column: :col', ['col' => $req])],
                ]);
            }
        }

        return $map;
    }

    private function canonicalHeaderKey(string $raw): ?string
    {
        $t = trim($raw);
        $t = preg_replace('/^\xEF\xBB\xBF/', '', $t) ?? $t;
        if ($t === '') {
            return null;
        }
        $t = strtolower(str_replace([' ', '-'], '_', $t));
        $t = preg_replace('/[^a-z0-9_]/', '', $t) ?? $t;

        return $t !== '' ? $t : null;
    }

    /**
     * @param  list<string|null>  $dataRow
     * @param  array<int, string>  $columnMap
     * @return array<string, mixed>
     */
    private function rowToPayload(array $dataRow, array $columnMap): array
    {
        $payload = [];
        foreach ($columnMap as $index => $key) {
            $payload[$key] = $dataRow[$index] ?? null;
            if (is_string($payload[$key])) {
                $payload[$key] = trim($payload[$key]);
                if ($payload[$key] === '') {
                    $payload[$key] = null;
                }
            }
        }

        return $payload;
    }

    /**
     * @param  list<string|null>  $row
     */
    private function rowIsBlank(array $row): bool
    {
        foreach ($row as $v) {
            if ($v !== null && trim((string) $v) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function rowLooksLikeTemplateHint(array $payload): bool
    {
        $fn = strtolower(trim((string) ($payload['facility_name'] ?? '')));

        return str_contains($fn, 'required:') || str_starts_with(trim((string) ($payload['facility_name'] ?? '')), 'e.g.');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function createOutletFromImportRow(User $user, array $payload): void
    {
        $facilityName = (string) ($payload['facility_name'] ?? '');
        $ownerName = (string) ($payload['owner_name'] ?? '');
        $physical = (string) ($payload['physical_location'] ?? '');
        if ($facilityName === '' || $ownerName === '' || $physical === '') {
            throw ValidationException::withMessages([
                'row' => [__('facility_name, owner_name, and physical_location are required.')],
            ]);
        }

        $lat = $this->parseCoordinate($payload['latitude'] ?? null, 'latitude');
        $lng = $this->parseCoordinate($payload['longitude'] ?? null, 'longitude');

        $outletType = isset($payload['outlet_type']) && is_string($payload['outlet_type']) && trim($payload['outlet_type']) !== ''
            ? trim((string) $payload['outlet_type'])
            : $this->inferOutletType(
                (string) ($payload['selected_category'] ?? ''),
                (string) ($payload['type_of_account'] ?? ''),
            );

        $wardId = null;
        if (isset($payload['ward_id']) && $payload['ward_id'] !== null && $payload['ward_id'] !== '') {
            $wardId = (int) $payload['ward_id'];
            if ($wardId < 1 || ! DB::table('wards')->where('id', $wardId)->exists()) {
                throw ValidationException::withMessages([
                    'ward_id' => [__('Invalid ward_id.')],
                ]);
            }
        }

        $status = 'pending';
        if (isset($payload['status']) && is_string($payload['status']) && $payload['status'] !== '') {
            $s = strtolower(trim($payload['status']));
            if (! in_array($s, ['pending', 'approved', 'rejected'], true)) {
                throw ValidationException::withMessages([
                    'status' => [__('status must be pending, approved, or rejected.')],
                ]);
            }
            $status = $s;
        }

        $gps = null;
        if (isset($payload['gps_accuracy_meters']) && $payload['gps_accuracy_meters'] !== null && $payload['gps_accuracy_meters'] !== '') {
            $gps = (int) $payload['gps_accuracy_meters'];
            if ($gps < 0 || $gps > 99999) {
                throw ValidationException::withMessages([
                    'gps_accuracy_meters' => [__('Invalid GPS accuracy.')],
                ]);
            }
        }

        $photosPayload = $this->parseImageUrls((string) ($payload['image_urls'] ?? ''));

        DuplicateOutletSubmissionGuard::assertNotDuplicate($user, $facilityName, $lat, $lng);

        DB::transaction(function () use ($user, $facilityName, $ownerName, $physical, $payload, $lat, $lng, $outletType, $wardId, $status, $gps, $photosPayload): void {
            Outlet::query()->create([
                'company_id' => $user->company_id,
                'created_by' => $user->id,
                'client_submission_key' => null,
                'ward_id' => $wardId,
                'facility_name' => $facilityName,
                'outlet_type' => $outletType,
                'owner_name' => $ownerName,
                'business_phone' => isset($payload['business_phone']) ? (string) $payload['business_phone'] : null,
                'email' => isset($payload['email']) ? (string) $payload['email'] : null,
                'physical_location' => $physical,
                'landmark' => isset($payload['landmark']) ? (string) $payload['landmark'] : null,
                'latitude' => $lat,
                'longitude' => $lng,
                'gps_accuracy_meters' => $gps,
                'type_of_account' => isset($payload['type_of_account']) ? (string) $payload['type_of_account'] : null,
                'medical_facility_status' => isset($payload['medical_facility_status']) ? (string) $payload['medical_facility_status'] : null,
                'outlet_serviced_by_med' => isset($payload['outlet_serviced_by_med']) ? (string) $payload['outlet_serviced_by_med'] : null,
                'selected_category' => isset($payload['selected_category']) ? (string) $payload['selected_category'] : null,
                'remarks' => isset($payload['remarks']) ? (string) $payload['remarks'] : null,
                'photos' => $photosPayload,
                'status' => $status,
            ]);
        });
    }

    private function parseCoordinate(mixed $value, string $field): float
    {
        if ($value === null || $value === '') {
            throw ValidationException::withMessages([
                $field => [__('Required.')],
            ]);
        }
        $n = is_numeric($value) ? (float) $value : (float) str_replace(',', '.', (string) $value);
        if ($field === 'latitude' && ($n < -90 || $n > 90)) {
            throw ValidationException::withMessages([
                $field => [__('Latitude must be between -90 and 90.')],
            ]);
        }
        if ($field === 'longitude' && ($n < -180 || $n > 180)) {
            throw ValidationException::withMessages([
                $field => [__('Longitude must be between -180 and 180.')],
            ]);
        }

        return $n;
    }

    /**
     * @return array<int, string>|null
     */
    private function parseImageUrls(string $raw): ?array
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        $parts = preg_split('/[|]/', $raw) ?: [];
        $out = [];
        foreach ($parts as $part) {
            $u = trim((string) $part);
            if ($u === '') {
                continue;
            }
            if (! filter_var($u, FILTER_VALIDATE_URL)) {
                throw ValidationException::withMessages([
                    'image_urls' => [__('Invalid URL in image_urls: :u', ['u' => $u])],
                ]);
            }
            if (! str_starts_with($u, 'https://') && ! str_starts_with($u, 'http://')) {
                throw ValidationException::withMessages([
                    'image_urls' => [__('Image URLs must start with http:// or https://')],
                ]);
            }
            $out[] = $u;
        }

        return $out === [] ? null : array_values($out);
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

    private function zipExtensionLoaded(): bool
    {
        return extension_loaded('zip');
    }

    /**
     * Excel 2003 SpreadsheetML (single XML file, opens in Excel). Used when {@see zipExtensionLoaded()} is false
     * since OOXML .xlsx requires ZipArchive.
     *
     * @param  list<list<string|int|float|null>>  $rows
     */
    private function streamExcel2003Xml(array $rows, string $downloadName, string $sheetName): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows, $sheetName): void {
            echo "<?xml version=\"1.0\"?>\n";
            echo "<?mso-application progid=\"Excel.Sheet\"?>\n";
            echo '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
            echo '<Worksheet ss:Name="'.$this->xmlAttr($sheetName).'"><Table>';
            foreach ($rows as $row) {
                echo '<Row>';
                foreach ($row as $cell) {
                    $s = $this->escapeXml((string) ($cell ?? ''));
                    echo '<Cell><Data ss:Type="String">'.$s.'</Data></Cell>';
                }
                echo '</Row>';
            }
            echo '</Table></Worksheet></Workbook>';
        }, $downloadName, [
            'Content-Type' => 'application/vnd.ms-excel',
        ]);
    }

    private function xmlAttr(string $name): string
    {
        $s = mb_substr(preg_replace('/[^A-Za-z0-9 _-]/', '', $name) ?? '', 0, 31);
        if ($s === '') {
            $s = 'Sheet1';
        }

        return $this->escapeXml($s);
    }

    private function escapeXml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
