{{-- <x-nq::github-activity.ref href="https://github.com/acme/storefront" class="text-label text-foreground">acme/storefront</x-nq::github-activity.ref>
     A link when there is an href (opens GitHub in a new tab), plain text when not. Internal to <x-nq::github-activity>. --}}
@props(['href' => null])
@if ($href)
    <a href="{{ $href }}" target="_blank" rel="noopener noreferrer"
        {{ $attributes->cn('rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus') }}>{{ $slot }}</a>
@else
    <span class="{{ $attributes->get('class') }}">{{ $slot }}</span>
@endif
