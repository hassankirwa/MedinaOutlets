<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ward extends Model
{
    protected $fillable = [
        'county_id',
        'sub_county_id',
        'name',
        'estimated_outlets',
        'priority',
        'urban_rural_class',
    ];

    /**
     * @return BelongsTo<County, $this>
     */
    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    /**
     * @return BelongsTo<SubCounty, $this>
     */
    public function subCounty(): BelongsTo
    {
        return $this->belongsTo(SubCounty::class);
    }
}
