<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',       // 'admin' | 'user'
        'industry',   // 'fnb' | 'retail' | 'warehouse'
        'company_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Automatically include company_name in every JSON response
    // so GET /api/user returns it without any extra route logic.
    protected $appends = ['company_name'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    /**
     * The company this user belongs to.
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Appended attribute: company_name
     * Returns the related company's name, or null if not assigned.
     * Accessed as $user->company_name in PHP and "company_name" in JSON.
     */
    public function getCompanyNameAttribute(): ?string
    {
        // Use already-loaded relation to avoid extra query if eager-loaded,
        // otherwise lazy-load it now.
        return $this->company?->name;
    }
}
