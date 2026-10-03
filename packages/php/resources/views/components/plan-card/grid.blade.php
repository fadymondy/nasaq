{{-- <x-nq::plan-card.grid> <x-nq::plan-card …/> … </x-nq::plan-card.grid>
     Lays plan cards side by side from 48rem of container width (up to 4), stacked below it. Leaves room for the badge pills. --}}
<div data-slot="plan-grid" class="@container">
    <div {{ $attributes->cn('grid grid-cols-1 gap-x-4 gap-y-7 pt-3 @3xl:auto-cols-fr @3xl:grid-flow-col') }}>{{ $slot }}</div>
</div>
