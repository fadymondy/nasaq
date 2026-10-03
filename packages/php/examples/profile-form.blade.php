@php
    $values = [
        'name' => 'Sara Haddad', 'username' => 'sara.haddad', 'email' => 'sara@sahab.studio', 'phone' => '+966501234567',
        'bio' => 'Product designer building bilingual interfaces.', 'locale' => 'en', 'timezone' => 'Asia/Riyadh',
        'location' => 'Riyadh, Saudi Arabia', 'website' => 'https://sara.example.com',
    ];
    $zones = ['Asia/Riyadh' => 'Riyadh (GMT+3)', 'Africa/Cairo' => 'Cairo (GMT+2)', 'Europe/London' => 'London (GMT+1)'];
@endphp
<x-nq::profile-form :values="$values" :timezones="$zones" :email-verified="false" check-username has-resend has-change-email has-avatar profile-href="/u/sara.haddad" />
