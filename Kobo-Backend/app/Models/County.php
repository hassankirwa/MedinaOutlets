<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class County extends Model
{
    protected $fillable = [
        'name',
        'code',
    ];

    /**
     * @return HasMany<SubCounty, $this>
     */
    public function subCounties(): HasMany
    {
        return $this->hasMany(SubCounty::class);
    }

    /**
     * @return HasMany<Ward, $this>
     */
    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class);
    }
}
