{{-- <x-nq::field.error>Required</x-nq::field.error>
     Error text is never colour-only: it is announced (role="alert") and paired with the invalid border. Visible while the field is invalid. --}}
@aware(['invalid' => false])
<div data-slot="field-error" role="alert" x-show="invalid" @unless ($invalid) style="display: none" @endunless {{ $attributes->cn('text-caption text-nq-danger-text') }}>{{ $slot }}</div>
