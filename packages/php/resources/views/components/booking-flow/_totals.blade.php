{{-- Internal: the service, tax and total lines shared by the payment and review steps of x-nq::booking-flow. Included, so it sees the parent's $T and $taxRate. --}}
<dl x-show="hasTotal()" style="display: none" class="m-0 grid gap-1 rounded-control bg-secondary p-3 text-body-sm">
    <div class="flex justify-between">
        <dt class="text-muted-foreground">{{ $T('Service', 'الخدمة') }}</dt>
        <dd class="m-0"><bdi x-text="subtotalText()"></bdi></dd>
    </div>
    @if ($taxRate > 0)
        <div class="flex justify-between">
            <dt class="text-muted-foreground">{{ $T('Tax', 'الضريبة') }}</dt>
            <dd class="m-0"><bdi x-text="taxText()"></bdi></dd>
        </div>
    @endif
    <div class="flex justify-between text-label">
        <dt>{{ $T('Total', 'الإجمالي') }}</dt>
        <dd class="m-0"><bdi x-text="totalLine()"></bdi></dd>
    </div>
</dl>
