<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Ward */
class WardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'county_id' => $this->county_id,
            'sub_county_id' => $this->sub_county_id,
            'name' => $this->name,
            'estimated_outlets' => $this->estimated_outlets,
            'priority' => $this->priority,
            'urban_rural_class' => $this->urban_rural_class,
        ];
    }
}
