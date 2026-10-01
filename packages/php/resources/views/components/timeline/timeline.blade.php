{{-- <x-nq::timeline><x-nq::timeline.item title="Assigned MH-142" :time="now()->subMinutes(5)" /></x-nq::timeline>
     A vertical list of events, newest first by convention, with a rail on the inline-start side. --}}
<ol data-slot="timeline" {{ $attributes->cn('m-0 flex list-none flex-col p-0') }}>{{ $slot }}</ol>
