{{-- <x-nq::icon.ltr>a@b.co</x-nq::icon.ltr>  Isolates left-to-right content (codes, emails, URLs, numbers with units) inside RTL text. --}}
<span data-slot="ltr" dir="ltr" {{ $attributes->cn('[unicode-bidi:isolate]') }}>{{ $slot }}</span>
