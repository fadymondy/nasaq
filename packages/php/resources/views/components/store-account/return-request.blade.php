{{-- <x-nq::store-account.return-request :order="$order" :requests="$returns" currency="USD" can-back @nq-return-submit="send($event.detail.submission)" />
     The return / refund request flow: pick lines and quantities, a reason, photos when the reason needs proof, how to be refunded, with the return window and a live refund estimate.
     Every check comes from the same planReturn maths as the React kit. order: the CommerceOrder shape (delivered orders only open the window). requests: existing requests, so units already in a return are not offered again.
     return-days: 30. now: ISO reference time (default now). max-photos: 5 (images under 5 MB). can-back: shows the back button. labels: override strings by key.
     Events from the root: nq-return-submit { submission: { orderId, lines, reason, note, photos: File[], refundMethod, refundAmount } } (only when the request is valid), nq-back.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-account._strings')
@props(['order', 'currency' => null, 'requests' => [], 'returnDays' => 30, 'now' => null, 'maxPhotos' => 5, 'canBack' => false, 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $methods = ($order['payment'] ?? null) === 'cod' ? ['store-credit', 'bank'] : ['original', 'store-credit'];
    $config = [
        'order' => $order, 'requests' => array_values($requests), 'returnDays' => $returnDays, 'now' => $now ?? now()->toIso8601String(), 'maxPhotos' => $maxPhotos,
        'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t,
    ];
    $alert = 'm-0 text-body-sm text-nq-danger-text';
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'store-return-request') }}" novalidate x-data="nqStoreReturnRequest(@js($config))" x-on:submit.prevent="submit()" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-5') }}>
    @if ($canBack)
        <x-nq::button type="button" variant="ghost" size="sm" class="self-start" x-on:click="back()">
            <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
            {{ $t['back'] }}
        </x-nq::button>
    @endif
    <header class="flex flex-col gap-1">
        <h2 class="m-0 text-h3 font-semibold">{{ $t['returnTitle'] }} <bdi class="text-muted-foreground" x-text="order.number"></bdi></h2>
        <p class="m-0 text-body-sm text-muted-foreground">{{ $t['returnIntro'] }}</p>
        <p class="m-0 text-body-sm" x-bind:class="win.open ? 'text-muted-foreground' : 'font-medium text-foreground'" x-bind:role="win.open ? null : 'alert'" x-text="windowText"></p>
    </header>

    <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" x-bind:disabled="! win.open">
        <legend class="mb-2 text-label font-semibold">{{ $t['returnPick'] }}</legend>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
            <template x-for="row in rows" x-bind:key="row.line.id">
                <li class="flex flex-wrap items-center gap-3 rounded-card border bg-card p-3" x-bind:class="(isOn(row.line.id) ? 'border-primary' : 'border-border') + (row.returnable === 0 ? ' opacity-60' : '')">
                    <input type="checkbox" class="size-4 shrink-0 accent-[var(--nq-action)]" x-bind:aria-label="row.line.name" x-bind:disabled="row.returnable === 0" x-bind:checked="isOn(row.line.id)"
                        x-on:change="toggle(row.line.id, row.returnable, $el.checked)">
                    <span class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
                        <img x-show="row.line.image" x-bind:src="row.line.image" alt="" class="size-full object-cover" />
                        <x-lucide-package x-show="! row.line.image" aria-hidden="true" class="size-5 text-muted-foreground" />
                    </span>
                    <div class="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                        <span class="truncate font-medium" x-text="row.line.name"></span>
                        <span class="truncate text-body-sm text-muted-foreground" x-show="row.line.variantLabel" x-text="row.line.variantLabel"></span>
                        <span class="text-caption text-muted-foreground" x-text="leftText(row)"></span>
                    </div>
                    <div class="flex items-center gap-1" role="group" x-show="row.returnable > 0" x-bind:aria-label="qtyLabel(row.line.name)">
                        <x-nq::button type="button" size="icon-sm" variant="secondary" aria-label="-" x-bind:disabled="atMin(row.line.id)" x-on:click="set(row.line.id, qtyOf(row.line.id) - 1, row.returnable)">
                            <x-lucide-minus aria-hidden="true" />
                        </x-nq::button>
                        <span class="min-w-6 text-center tabular-nums" aria-live="polite" x-text="num(qtyOf(row.line.id))"></span>
                        <x-nq::button type="button" size="icon-sm" variant="secondary" aria-label="+" x-bind:disabled="atMax(row.line.id, row.returnable)" x-on:click="set(row.line.id, qtyOf(row.line.id) + 1, row.returnable)">
                            <x-lucide-plus aria-hidden="true" />
                        </x-nq::button>
                    </div>
                    <p class="m-0 basis-full text-caption text-nq-danger-text" x-show="over(row.line.id) !== ''" x-text="over(row.line.id)"></p>
                </li>
            </template>
        </ul>
        <p role="alert" class="{{ $alert }}" x-show="has('empty')" style="display: none">{{ $t['issueEmpty'] }}</p>
    </fieldset>

    <div class="flex flex-col gap-2">
        <span class="text-label font-semibold">{{ $t['returnReason'] }}</span>
        <x-nq::select x-model="reason">
            <x-nq::select.trigger aria-label="{{ $t['returnReason'] }}" x-bind:aria-invalid="bad.reason"><x-nq::select.value placeholder="{{ $t['reasonPlaceholder'] }}" /></x-nq::select.trigger>
            <x-nq::select.content>
                @foreach ($t['reasons'] as $key => $label)
                    <x-nq::select.item :value="$key">{{ $label }}</x-nq::select.item>
                @endforeach
            </x-nq::select.content>
        </x-nq::select>
        <p role="alert" class="{{ $alert }}" x-show="has('reason')" style="display: none">{{ $t['issueReason'] }}</p>
        <label class="flex flex-col gap-1.5 text-body-sm">
            <span class="font-medium">{{ $t['returnNote'] }}</span>
            <x-nq::field.textarea rows="3" x-model="note" x-bind:aria-invalid="bad.note" />
        </label>
        <p role="alert" class="{{ $alert }}" x-show="has('note')" style="display: none">{{ $t['returnNoteRequired'] }}</p>
    </div>

    <div class="flex flex-col gap-2">
        <span class="text-label font-semibold">{{ $t['photos'] }}</span>
        <p class="m-0 text-body-sm" x-bind:class="has('photos') ? 'text-nq-danger-text' : 'text-muted-foreground'" x-bind:role="has('photos') ? 'alert' : null" x-text="photoHint"></p>
        <label class="flex cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-border bg-card px-4 py-6 text-center text-body-sm text-muted-foreground transition-colors duration-150 ease-nq hover:bg-nq-hover focus-within:outline-2 focus-within:outline-nq-focus">
            <x-lucide-image-plus aria-hidden="true" class="size-5" />
            {{ $t['photoPrompt'] }}
            <input type="file" accept="image/*" multiple class="sr-only" aria-label="{{ $t['photos'] }}" x-on:change="pickFiles($event)">
        </label>
        <p role="alert" class="{{ $alert }}" x-show="photoError !== ''" style="display: none" x-text="photoError"></p>
        <ul class="m-0 flex list-none flex-wrap gap-2 p-0" x-show="photos.length > 0" style="display: none">
            <template x-for="photo in photos" x-bind:key="photo.id">
                <li class="relative size-20 overflow-hidden rounded-control border border-border bg-secondary">
                    <img x-bind:src="photo.url" x-bind:alt="photo.name" class="size-full object-cover" />
                    <button type="button" x-bind:aria-label="removeLabel(photo)" x-on:click="removePhoto(photo.id)"
                        class="absolute end-1 top-1 inline-flex size-6 items-center justify-center rounded-full border border-border bg-card text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3.5" />
                    </button>
                </li>
            </template>
        </ul>
    </div>

    <div class="flex flex-col gap-2">
        <span class="text-label font-semibold">{{ $t['refundMethod'] }}</span>
        <x-nq::radio-group aria-label="{{ $t['refundMethod'] }}" :default-value="$methods[0]" class="grid gap-2" x-model="method">
            @foreach ($methods as $m)
                <x-nq::radio-group.card :value="$m" :title="$t['methods'][$m]" :description="$t['methodHints'][$m]" />
            @endforeach
        </x-nq::radio-group>
        <p role="alert" class="{{ $alert }}" x-show="has('method')" style="display: none">{{ $t['issueMethod'] }}</p>
    </div>

    <div class="flex flex-col gap-1 rounded-card border border-border bg-secondary p-4">
        <div class="flex items-center justify-between gap-3">
            <span class="text-label font-semibold">{{ $t['refundEstimate'] }}</span>
            <span class="text-h3 font-semibold tabular-nums" x-text="estimate"></span>
        </div>
        <p class="m-0 text-caption text-muted-foreground">{{ $t['estimateNote'] }}</p>
    </div>

    <div class="flex flex-col gap-2">
        <p role="alert" class="{{ $alert }}" x-show="tried ? ! plan.ok : false" style="display: none">{{ $t['fixIssues'] }}</p>
        <x-nq::button type="submit" variant="primary" class="self-start" x-bind:disabled="! win.open">{{ $t['submitReturn'] }}</x-nq::button>
    </div>
</form>
