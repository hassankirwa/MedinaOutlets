<?php

namespace Database\Seeders;

use App\Models\County;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Seeds all 47 Kenya counties and electoral wards from bundled IEBC-shaped open data
 * (database/data/kenya_admin_results.json, sourced from m-root/kenyas_administrative_data_json).
 */
class KenyaCountiesAndWardsSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/kenya_admin_results.json');
        if (! File::exists($path)) {
            $this->command?->error('Missing '.$path.'. Place results.json from github.com/m-root/kenyas_administrative_data_json there.');

            return;
        }

        /** @var array{county: list<array{id:string,name:string}>, constituency: list<array{id:string,name:string,county:string}>, ward: list<array{id:string,name:string,constituency:string,sub_county?:string}>} $data */
        $data = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);

        $catalog = $this->officialCountiesByNormalizedKey();

        foreach ($data['county'] as $c) {
            $key = $this->normalizeCountyKey($c['name']);
            if (! isset($catalog[$key])) {
                $this->command?->warn('Unknown county in JSON (add alias): '.$c['name']);

                continue;
            }
            $meta = $catalog[$key];
            County::query()->updateOrCreate(
                ['code' => $meta['code']],
                ['name' => $meta['display']],
            );
        }

        if (County::query()->count() < 47) {
            $this->command?->error('Expected 47 counties; check catalog aliases vs JSON county names.');

            return;
        }

        $uuidToCountyId = [];
        foreach ($data['county'] as $c) {
            $key = $this->normalizeCountyKey($c['name']);
            if (! isset($catalog[$key])) {
                continue;
            }
            $code = $catalog[$key]['code'];
            $model = County::query()->where('code', $code)->first();
            if ($model !== null) {
                $uuidToCountyId[$c['id']] = $model->id;
            }
        }

        $countyByConstituency = [];
        foreach ($data['constituency'] as $con) {
            $countyByConstituency[$con['id']] = $con['county'];
        }

        $constituencyNameById = [];
        foreach ($data['constituency'] as $con) {
            $constituencyNameById[$con['id']] = $con['name'];
        }

        $items = [];
        foreach ($data['ward'] as $w) {
            $conId = $w['constituency'];
            $countyUuid = $countyByConstituency[$conId] ?? null;
            if ($countyUuid === null || ! isset($uuidToCountyId[$countyUuid])) {
                continue;
            }
            $items[] = [
                'county_id' => $uuidToCountyId[$countyUuid],
                'raw_name' => trim((string) $w['name']),
                'constituency_name' => $constituencyNameById[$conId] ?? '',
            ];
        }

        $grouped = [];
        foreach ($items as $idx => $item) {
            $k = $item['county_id'].'|'.$this->normalizeWardKey($item['raw_name']);
            $grouped[$k][] = ['i' => $idx, 'item' => $item];
        }

        $resolved = [];
        foreach ($grouped as $members) {
            $n = count($members);
            if ($n === 1) {
                $item = $members[0]['item'];
                $resolved[] = [
                    'county_id' => $item['county_id'],
                    'name' => $item['raw_name'],
                ];

                continue;
            }

            $constNames = array_unique(array_map(fn (array $m) => $m['item']['constituency_name'], $members));
            $sameConstituencyOnly = count($constNames) === 1;

            usort($members, function (array $a, array $b): int {
                return strcmp($a['item']['constituency_name'], $b['item']['constituency_name']);
            });

            foreach ($members as $pos => $m) {
                $item = $m['item'];
                if ($sameConstituencyOnly) {
                    $name = $item['raw_name'].' ('.(string) ($pos + 1).')';
                } else {
                    $name = $item['raw_name'].' — '.$item['constituency_name'];
                }
                $resolved[] = [
                    'county_id' => $item['county_id'],
                    'name' => $name,
                ];
            }
        }

        DB::transaction(function () use ($resolved): void {
            foreach ($resolved as $row) {
                Ward::query()->updateOrCreate(
                    [
                        'county_id' => $row['county_id'],
                        'name' => $row['name'],
                    ],
                    [
                        'sub_county_id' => null,
                        'estimated_outlets' => null,
                        'priority' => null,
                        'urban_rural_class' => null,
                    ],
                );
            }
        });

        $this->command?->info('Kenya counties + wards seeded: '.County::query()->count().' counties, '.Ward::query()->count().' wards.');
    }

    /**
     * Official order 001–047 (CRA / constitutional listing), display names for UI.
     *
     * @return array<string, array{code: string, display: string}>
     */
    private function officialCountiesByNormalizedKey(): array
    {
        $rows = [
            ['001', 'Mombasa', ['MOMBASA']],
            ['002', 'Kwale', ['KWALE']],
            ['003', 'Kilifi', ['KILIFI']],
            ['004', 'Tana River', ['TANA RIVER']],
            ['005', 'Lamu', ['LAMU']],
            ['006', 'Taita–Taveta', ['TAITA TAVETA', 'TAITA-TAVETA']],
            ['007', 'Garissa', ['GARISSA']],
            ['008', 'Wajir', ['WAJIR']],
            ['009', 'Mandera', ['MANDERA']],
            ['010', 'Marsabit', ['MARSABIT']],
            ['011', 'Isiolo', ['ISIOLO']],
            ['012', 'Meru', ['MERU']],
            ['013', 'Tharaka-Nithi', ['THARAKA-NITHI', 'THARAKA NITHI']],
            ['014', 'Embu', ['EMBU']],
            ['015', 'Kitui', ['KITUI']],
            ['016', 'Machakos', ['MACHAKOS']],
            ['017', 'Makueni', ['MAKUENI']],
            ['018', 'Nyandarua', ['NYANDARUA']],
            ['019', 'Nyeri', ['NYERI']],
            ['020', 'Kirinyaga', ['KIRINYAGA']],
            ['021', "Murang'a", ['MURANGA', "MURANG'A"]],
            ['022', 'Kiambu', ['KIAMBU']],
            ['023', 'Turkana', ['TURKANA']],
            ['024', 'West Pokot', ['WEST POKOT']],
            ['025', 'Samburu', ['SAMBURU']],
            ['026', 'Trans Nzoia', ['TRANS NZOIA']],
            ['027', 'Uasin Gishu', ['UASIN GISHU']],
            ['028', 'Elgeyo-Marakwet', ['ELGEYO MARAKWET', 'ELEGEYO MARAKWET', 'ELEGEYO-MARAKWET', 'ELGEYO-MARAKWET']],
            ['029', 'Nandi', ['NANDI']],
            ['030', 'Baringo', ['BARINGO']],
            ['031', 'Laikipia', ['LAIKIPIA']],
            ['032', 'Nakuru', ['NAKURU']],
            ['033', 'Narok', ['NAROK']],
            ['034', 'Kajiado', ['KAJIADO']],
            ['035', 'Kericho', ['KERICHO']],
            ['036', 'Bomet', ['BOMET']],
            ['037', 'Kakamega', ['KAKAMEGA']],
            ['038', 'Vihiga', ['VIHIGA']],
            ['039', 'Bungoma', ['BUNGOMA']],
            ['040', 'Busia', ['BUSIA']],
            ['041', 'Siaya', ['SIAYA']],
            ['042', 'Kisumu', ['KISUMU']],
            ['043', 'Homa Bay', ['HOMA BAY']],
            ['044', 'Migori', ['MIGORI']],
            ['045', 'Kisii', ['KISII']],
            ['046', 'Nyamira', ['NYAMIRA']],
            ['047', 'Nairobi', ['NAIROBI']],
        ];

        $out = [];
        foreach ($rows as [$code, $display, $aliases]) {
            foreach ($aliases as $alias) {
                $out[$this->normalizeCountyKey($alias)] = ['code' => $code, 'display' => $display];
            }
        }

        return $out;
    }

    private function normalizeCountyKey(string $name): string
    {
        $s = mb_strtoupper(trim($name), 'UTF-8');
        $s = str_replace(["'", '’', '`'], '', $s);
        $s = str_replace(['/', '-'], ' ', $s);
        $s = preg_replace('/\s+/u', ' ', $s) ?? $s;

        return trim($s);
    }

    private function normalizeWardKey(string $name): string
    {
        return mb_strtoupper(trim($name), 'UTF-8');
    }
}
