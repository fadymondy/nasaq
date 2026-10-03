{{-- <x-nq::workspace-settings.slug-field :label="…" prefix="nasaq.app/" />
     The address field of the workspace forms: a left-to-right prefix, the input, and the availability mark. Internal: it reads the Alpine scope of
     create-form / workspace-settings (slug, slugBad, slugMsg, hint, check.status, busy, onSlug()). --}}
@props(['label', 'prefix' => null, 'disabled' => 'busy'])
<x-nq::field x-model="slugBad">
    <x-nq::field.label>{{ $label }}</x-nq::field.label>
    <x-nq::input-group dir="ltr">
        @if ($prefix)<x-nq::input-group.addon><x-nq::input-group.text>{{ $prefix }}</x-nq::input-group.text></x-nq::input-group.addon>@endif
        <x-nq::input-group.input autocapitalize="none" autocorrect="off" spellcheck="false" x-bind:value="slug" x-on:input="onSlug($event.target.value)" x-bind:disabled="{{ $disabled }}" />
        <x-nq::input-group.addon align="end" x-show="check.status !== 'idle'" style="display: none">
            <template x-if="check.status === 'checking'"><x-nq::spinner class="size-4" /></template>
            <template x-if="check.status === 'available'"><x-lucide-circle-check aria-hidden="true" class="size-4 text-nq-success-text" /></template>
            <template x-if="check.status === 'taken'"><x-lucide-circle-x aria-hidden="true" class="size-4 text-nq-danger-text" /></template>
        </x-nq::input-group.addon>
    </x-nq::input-group>
    <x-nq::field.error><span x-text="slugMsg"></span></x-nq::field.error>
    <p x-show="! slugBad" style="display: none" data-slot="field-description" class="text-caption text-muted-foreground" x-text="hint"></p>
</x-nq::field>
