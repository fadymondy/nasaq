{{-- <x-nq::oauth-buttons.divider />   <x-nq::oauth-buttons.divider>or continue with email</x-nq::oauth-buttons.divider>
     A rule with a word in the middle between the OAuth buttons and a form. Default "or" / "أو". --}}
<div data-slot="{{ $attributes->get('data-slot', 'oauth-divider') }}" role="separator" {{ $attributes->except('data-slot')->cn('flex items-center gap-3 text-caption text-muted-foreground') }}>
    <span aria-hidden="true" class="h-px flex-1 bg-border"></span>
    <span>{{ $slot->isEmpty() ? \Nasaq\Nasaq::t('or', 'أو') : $slot }}</span>
    <span aria-hidden="true" class="h-px flex-1 bg-border"></span>
</div>
