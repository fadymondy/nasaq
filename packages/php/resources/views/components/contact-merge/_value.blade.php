{{-- Internal to <x-nq::contact-merge>: one field value as text. Emails and phone numbers read left to right, also in Arabic. --}}
@props(['value' => null, 'ltr' => false, 'empty' => ''])
@php
    $blank = $value === null || (is_string($value) ? trim($value) === '' : count((array) $value) === 0);
    $text = is_string($value) ? $value : implode(', ', (array) $value);
@endphp
@if ($blank)<span class="text-muted-foreground">{{ $empty }}</span>@elseif ($ltr)<bdi dir="ltr" class="tabular-nums">{{ $text }}</bdi>@else<span dir="auto">{{ $text }}</span>@endif
