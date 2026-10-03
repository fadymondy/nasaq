{{-- Internal: the source badge of a lead, from the Alpine fields sourceKind and sourceDetail of $scope ("row" in the table, "cur" in the sheet). --}}
<span class="inline-flex min-w-0 items-center gap-1.5">
    @foreach (['paid' => 'accent', 'organic' => 'success', 'social' => 'info', 'email' => 'brand', 'referral' => 'neutral', 'direct' => 'outline'] as $kind => $variant)
        <x-nq::badge variant="{{ $variant }}" x-show="{{ $scope }}.sourceKind === '{{ $kind }}'" style="display: none">{{ $L['sources'][$kind] }}</x-nq::badge>
    @endforeach
    <bdi dir="auto" class="truncate text-body-sm text-muted-foreground" x-show="{{ $scope }}.sourceDetail !== ''" style="display: none" x-text="{{ $scope }}.sourceDetail"></bdi>
</span>
