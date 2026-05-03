<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubCounty extends Model
{
    protected $fillable = [
        'county_id',
        'name',
    ];

    /**
     * @return BelongsTo<County, $this>
     */
    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    /**
     * @return HasMany<Ward, $this>
     */
    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class);
    }
}
