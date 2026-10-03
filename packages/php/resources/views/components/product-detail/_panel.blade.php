{{-- Internal: the body of one product-detail section (description, specs or shipping), shared by the tabs and the accordion. --}}
@if ($id === 'description')
    @if ($descriptionSlot && $descriptionSlot->isNotEmpty()) {{ $descriptionSlot }} @else <p class="{{ $prose }}">{{ $longDescription }}</p> @endif
@elseif ($id === 'shipping')
    @if ($shippingInfoSlot && $shippingInfoSlot->isNotEmpty()) {{ $shippingInfoSlot }} @else <p class="{{ $prose }}">{{ $shippingInfo }}</p> @endif
@else
    <dl class="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 text-body-sm">
        @foreach ($specRows as $row)
            <div class="col-span-2 grid grid-cols-subgrid border-b border-border py-2 last:border-b-0" @if (! empty($row['sku'])) x-show="variant" @endif>
                <dt class="text-muted-foreground">{{ $row['label'] }}</dt>
                <dd class="text-foreground">
                    @if (! empty($row['sku']))<bdi dir="ltr" x-text="variant?.sku ?? ''">{{ $row['value'] }}</bdi>@else{{ $row['value'] }}@endif
                </dd>
            </div>
        @endforeach
    </dl>
@endif
