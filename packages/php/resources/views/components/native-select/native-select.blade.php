{{-- <x-nq::native-select name="country" placeholder="Choose a country" :options="[['value' => 'eg', 'label' => 'Egypt']]" />
     The browser's own <select>, styled like Input. options: [{value, label, disabled?}] or <option>/<optgroup> in the slot.
     value: the selected option. size: sm | md. invalid: red border. class goes to the wrapper; every other attribute
     (name, required, disabled, id, wire:model, x-model) goes to the <select>. --}}
@props(['options' => [], 'placeholder' => null, 'size' => 'md', 'value' => null, 'invalid' => false, 'required' => false, 'disabled' => false])
<div data-slot="{{ $attributes->get('data-slot', 'native-select') }}" {{ $attributes->except('data-slot')->only('class')->cn('relative w-full min-w-0') }}>
    <select @if ($required) required @endif @if ($disabled) disabled @endif @if ($invalid) aria-invalid="true" data-invalid @endif
        {{ $attributes->except('class')->merge(['class' => \Nasaq\Cn::merge(
            'w-full min-w-0 appearance-none rounded-control border border-input bg-card ps-3 pe-9 text-body text-foreground',
            'min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none',
            'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
            'data-invalid:border-nq-danger aria-invalid:border-nq-danger',
            'disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]',
            $size === 'sm' ? 'h-control-sm' : 'h-control',
        )]) }}>
        @if ($placeholder !== null)
            <option value="" @if ($required) disabled @endif @if ((string) $value === '') selected @endif>{{ $placeholder }}</option>
        @endif
        @foreach ($options as $o)
            <option value="{{ $o['value'] }}" @if (! empty($o['disabled'])) disabled @endif @if ($value !== null && (string) $value === (string) $o['value']) selected @endif>{{ $o['label'] }}</option>
        @endforeach
        {{ $slot }}
    </select>
    <x-lucide-chevron-down aria-hidden="true" class="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
</div>
