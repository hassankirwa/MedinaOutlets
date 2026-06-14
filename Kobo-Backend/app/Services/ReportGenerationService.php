<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ReportGenerationService
{
    /** @var array<string, array{name: string, columns: array{0: string, 1: string}}> */
    private const REPORT_DEFINITIONS = [
        'submissions_by_branch' => [
            'name' => 'Submissions by branch',
            'columns' => ['Branch', 'Submissions'],
        ],
        'submissions_by_county' => [
            'name' => 'Submissions by county',
            'columns' => ['County', 'Submissions'],
        ],
        'submissions_by_ward' => [
            'name' => 'Submissions by ward',
            'columns' => ['Ward', 'Submissions'],
        ],
        'submissions_by_field_worker' => [
            'name' => 'Submissions by field worker',
            'columns' => ['Field worker', 'Submissions'],
        ],
        'outlet_category_summary' => [
            'name' => 'Outlet category summary',
            'columns' => ['Category', 'Submissions'],
        ],
        'approval_status' => [
            'name' => 'Approval status breakdown',
            'columns' => ['Status', 'Submissions'],
        ],
        'daily_collection_trend' => [
            'name' => 'Daily collection trend',
            'columns' => ['Date', 'Submissions'],
        ],
        'gps_photo_completion' => [
            'name' => 'GPS & photo completion',
            'columns' => ['Metric', 'Count'],
        ],
    ];

    /**
     * @return list<array{id: string, name: string, type: string, format: string, description: string}>
     */
    public function listReportTypes(): array
    {
        return collect(self::REPORT_DEFINITIONS)
            ->map(fn (array $def, string $type) => [
                'id' => $type,
                'type' => $type,
                'name' => $def['name'],
                'format' => 'CSV / XLSX',
                'description' => 'Aggregated submission data scoped to your workspace.',
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     type: string,
     *     title: string,
     *     columns: array{0: string, 1: string},
     *     rows: list<array{label: string, value: int|string}>,
     *     generated_at: string,
     *     filters: array<string, mixed>
     * }
     */
    public function generate(User $user, string $type, array $filters = []): array
    {
        $definition = $this->definition($type);
        $rows = $this->buildRows($user, $type, $filters);

        return [
            'type' => $type,
            'title' => $definition['name'],
            'columns' => $definition['columns'],
            'rows' => $rows,
            'generated_at' => now()->toIso8601String(),
            'filters' => $filters,
        ];
    }

    public function export(User $user, string $type, string $format, array $filters = []): BinaryFileResponse|StreamedResponse
    {
        $format = strtolower($format);
        $report = $this->generate($user, $type, $filters);
        $filename = $type.'-'.now()->format('Y-m-d_His');

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($report): void {
                $out = fopen('php://output', 'w');
                if ($out === false) {
                    return;
                }
                fwrite($out, "\xEF\xBB\xBF");
                fputcsv($out, $report['columns']);
                foreach ($report['rows'] as $row) {
                    fputcsv($out, [$row['label'], $row['value']]);
                }
                fclose($out);
            }, $filename.'.csv', [
                'Content-Type' => 'text/csv; charset=UTF-8',
            ]);
        }

        if ($format === 'xlsx') {
            if (! extension_loaded('zip')) {
                return $this->streamExcel2003Xml(
                    array_merge([$report['columns']], array_map(
                        fn (array $row) => [$row['label'], $row['value']],
                        $report['rows'],
                    )),
                    $filename.'.xls',
                    $report['title'],
                );
            }

            $tmp = tempnam(sys_get_temp_dir(), 'report');
            if ($tmp === false) {
                abort(500, 'Could not create temp file.');
            }

            $writer = new XlsxWriter;
            $writer->openToFile($tmp);
            $writer->getCurrentSheet()->setName(substr($report['title'], 0, 31));
            $writer->addRow(Row::fromValues($report['columns']));
            foreach ($report['rows'] as $row) {
                $writer->addRow(Row::fromValues([$row['label'], $row['value']]));
            }
            $writer->close();

            return response()->download($tmp, $filename.'.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])->deleteFileAfterSend(true);
        }

        abort(422, 'Invalid format. Use csv or xlsx.');
    }

    /**
     * @return array<string, mixed>
     */
    public function filtersFromRequest(Request $request): array
    {
        $filters = [];
        foreach (['project_id', 'branch_id', 'county_id', 'ward_id', 'created_by', 'status', 'outlet_type'] as $key) {
            if ($request->filled($key)) {
                $filters[$key] = $request->input($key);
            }
        }
        if ($request->filled('from')) {
            $filters['from'] = $request->date('from')->format('Y-m-d');
        }
        if ($request->filled('to')) {
            $filters['to'] = $request->date('to')->format('Y-m-d');
        }

        return $filters;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array{label: string, value: int|string}>
     */
    private function buildRows(User $user, string $type, array $filters): array
    {
        $o = (new Outlet)->getTable();
        $query = $this->scopedQuery($user);
        $this->applyFilters($query, $filters, $o);

        $data = match ($type) {
            'submissions_by_branch' => (clone $query)
                ->join('branches', 'branches.id', '=', $o.'.branch_id')
                ->selectRaw('branches.name as label, count(*) as count')
                ->groupBy('branches.name')
                ->orderByDesc('count')
                ->pluck('count', 'label'),
            'submissions_by_county' => (clone $query)
                ->leftJoin('counties', 'counties.id', '=', $o.'.county_id')
                ->selectRaw("coalesce(nullif({$o}.captured_county, ''), counties.name, 'Unknown') as label, count(*) as count")
                ->groupBy('label')
                ->orderByDesc('count')
                ->pluck('count', 'label'),
            'submissions_by_ward' => (clone $query)
                ->leftJoin('wards', 'wards.id', '=', $o.'.ward_id')
                ->selectRaw("coalesce(nullif({$o}.captured_ward, ''), wards.name, 'Unknown') as label, count(*) as count")
                ->groupBy('label')
                ->orderByDesc('count')
                ->pluck('count', 'label'),
            'submissions_by_field_worker' => (clone $query)
                ->join('users', 'users.id', '=', $o.'.created_by')
                ->selectRaw('users.name as label, count(*) as count')
                ->groupBy('users.name')
                ->orderByDesc('count')
                ->pluck('count', 'label'),
            'outlet_category_summary' => (clone $query)
                ->selectRaw("coalesce(nullif({$o}.outlet_type, ''), 'Unknown') as label, count(*) as count")
                ->groupBy('label')
                ->orderByDesc('count')
                ->pluck('count', 'label'),
            'approval_status' => (clone $query)
                ->selectRaw("coalesce(nullif({$o}.status, ''), 'unknown') as label, count(*) as count")
                ->groupBy('label')
                ->orderByDesc('count')
                ->pluck('count', 'label'),
            'daily_collection_trend' => (clone $query)
                ->selectRaw('date('.$o.'.created_at) as label, count(*) as count')
                ->groupBy('label')
                ->orderBy('label')
                ->pluck('count', 'label'),
            'gps_photo_completion' => $this->gpsPhotoReport($query, $o),
            default => abort(422, 'Unknown report type.'),
        };

        if ($type === 'gps_photo_completion') {
            return collect($data)
                ->map(fn ($value, $label) => [
                    'label' => str_replace('_', ' ', ucfirst((string) $label)),
                    'value' => (int) $value,
                ])
                ->values()
                ->all();
        }

        return collect($data)
            ->map(fn ($count, $label) => [
                'label' => (string) $label,
                'value' => (int) $count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return Builder<Outlet>
     */
    private function scopedQuery(User $user): Builder
    {
        $o = (new Outlet)->getTable();
        $query = Outlet::query();

        if ($user->role?->slug !== 'super_admin') {
            $query->where($o.'.company_id', $user->company_id);
        }

        return $query;
    }

    /**
     * @param  Builder<Outlet>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters, string $table): void
    {
        foreach (['project_id', 'branch_id', 'county_id', 'ward_id', 'created_by', 'status', 'outlet_type'] as $f) {
            if (! empty($filters[$f])) {
                $query->where($table.'.'.$f, $filters[$f]);
            }
        }
        if (! empty($filters['from'])) {
            $query->whereDate($table.'.created_at', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate($table.'.created_at', '<=', $filters['to']);
        }
    }

    /**
     * @param  Builder<Outlet>  $query
     * @return array<string, int>
     */
    private function gpsPhotoReport(Builder $query, string $o): array
    {
        $total = (clone $query)->count();
        $withGps = (clone $query)->whereNotNull($o.'.latitude')->count();
        $withPhotos = (clone $query)->whereNotNull($o.'.photos')->count();

        return [
            'total' => $total,
            'with_gps' => $withGps,
            'with_photos' => $withPhotos,
        ];
    }

    /**
     * @return array{name: string, columns: array{0: string, 1: string}}
     */
    private function definition(string $type): array
    {
        if (! isset(self::REPORT_DEFINITIONS[$type])) {
            abort(422, 'Unknown report type.');
        }

        return self::REPORT_DEFINITIONS[$type];
    }

    /**
     * @param  list<list<string|int>>  $rows
     */
    private function streamExcel2003Xml(array $rows, string $downloadName, string $sheetName): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows, $sheetName): void {
            echo "<?mso-application progid=\"Excel.Sheet\"?>\n";
            echo '<?xml version="1.0"?>'."\n";
            echo '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'."\n";
            echo ' xmlns:o="urn:schemas-microsoft-com:office:office"'."\n";
            echo ' xmlns:x="urn:schemas-microsoft-com:office:excel"'."\n";
            echo ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'."\n";
            echo '<Worksheet ss:Name="'.htmlspecialchars(substr($sheetName, 0, 31), ENT_QUOTES).'">'."\n";
            echo "<Table>\n";
            foreach ($rows as $row) {
                echo "<Row>\n";
                foreach ($row as $cell) {
                    $type = is_numeric($cell) ? 'Number' : 'String';
                    echo '<Cell><Data ss:Type="'.$type.'">'.htmlspecialchars((string) $cell, ENT_QUOTES)."</Data></Cell>\n";
                }
                echo "</Row>\n";
            }
            echo "</Table>\n</Worksheet>\n</Workbook>";
        }, $downloadName, [
            'Content-Type' => 'application/vnd.ms-excel',
        ]);
    }
}
