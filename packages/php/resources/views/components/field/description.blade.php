{{-- <x-nq::field.description>Shown in the sidebar and on invoices.</x-nq::field.description>  Linked to the control with aria-describedby. --}}
<p data-slot="{{ $attributes->get('data-slot', 'field-description') }}" {{ $attributes->except('data-slot')->cn('text-caption text-muted-foreground') }}>{{ $slot }}</p>
