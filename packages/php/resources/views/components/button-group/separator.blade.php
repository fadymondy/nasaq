{{-- <x-nq::button-group.separator />  A divider inside the group. Needed between buttons that have no border of their own (a primary split button). --}}
<div role="separator" data-slot="{{ $attributes->get('data-slot', 'button-group-separator') }}"
    {{ $attributes->except('data-slot')->cn('w-px shrink-0 self-stretch bg-primary-foreground/30 in-data-[orientation=vertical]:h-px in-data-[orientation=vertical]:w-auto') }}></div>
