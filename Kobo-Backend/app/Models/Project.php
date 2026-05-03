<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'company_id',
        'county_id',
        'name',
        'description',
        'status',
        'start_date',
        'end_date',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<County, $this>
     */
    public function county(): BelongsTo
    {
        return $this->belongsTo(County::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Field collectors assigned to this project.
     *
     * @return BelongsToMany<User, $this>
     */
    public function assignedWorkers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_user')
            ->withPivot(['assigned_at', 'assigned_by']);
    }

    /**
     * @return HasMany<ProjectWardAssignment, $this>
     */
    public function wardAssignments(): HasMany
    {
        return $this->hasMany(ProjectWardAssignment::class);
    }
}
