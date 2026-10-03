{{-- <x-nq::workspace-settings.create-form slug-prefix="nasaq.app/" @create="$event.detail.wait(createWorkspace($event.detail.values))" @check-slug="$event.detail.wait(isFree($event.detail.slug))" />
     Name and address of a new workspace; the address follows the name until the person edits it. Needs the Alpine runtime (@nasaqScripts).
     check-slug (false): true fires check-slug while typing; slug-prefix: shown before the address, always left-to-right. show-slug (true): false hides the address field. default-name, submit-label,
     cancel (false): true adds a Cancel button that fires "cancel". labels: any of the strings below, by key.
     It fires events on the root with detail { …, wait(promise) }:
       create      detail.values { name, slug }; resolve, or resolve { error, fieldErrors: { name, slug } } to keep the form and show them. A rejection shows a generic error.
       check-slug  detail.slug; resolve true / false / { available, message }. Nobody listening means no availability check.
       cancel      (no detail)
     dialog: wraps the form in a dialog (use <x-nq::workspace-settings.create-dialog>, which sets it). --}}
@props(['slugPrefix' => null, 'showSlug' => true, 'defaultName' => '', 'submitLabel' => null, 'cancel' => false, 'labels' => [], 'open' => false, 'dialog' => false, 'trigger' => null, 'checkSlug' => false])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $config = [
        'showSlug' => (bool) $showSlug, 'hasCheck' => (bool) $checkSlug, 'defaultName' => $defaultName, 'open' => (bool) $open,
        'labels' => [
            'nameRequired' => $L('nameRequired', 'Enter a name for the workspace.', 'أدخل اسمًا لمساحة العمل.'),
            'slugHelp' => $L('slugHelp', 'Letters, numbers and dashes. You can change it later.', 'أحرف وأرقام وشرطات. يمكنك تغييره لاحقًا.'),
            'slugChecking' => $L('slugChecking', 'Checking availability', 'جارٍ التحقق من التوفر'),
            'slugAvailable' => $L('slugAvailable', 'This address is available.', 'هذا العنوان متاح.'),
            'slugTaken' => $L('slugTaken', 'That address is taken. Try another one.', 'هذا العنوان مستخدم. جرّب عنوانًا آخر.'),
            'slugCheckFailed' => $L('slugCheckFailed', 'Availability could not be checked. It will be verified when you create it.', 'تعذّر التحقق من التوفر. سيُتحقق منه عند الإنشاء.'),
            'problemEmpty' => $L('problemEmpty', 'Enter an address for the workspace.', 'أدخل عنوانًا لمساحة العمل.'),
            'problemShort' => $L('problemShort', 'Use at least 3 characters.', 'استخدم 3 أحرف على الأقل.'),
            'problemLong' => $L('problemLong', 'Use at most 40 characters.', 'استخدم 40 حرفًا على الأكثر.'),
            'problemFormat' => $L('problemFormat', 'Use lowercase letters, numbers and dashes. Start and end with a letter or number.', 'استخدم أحرفًا لاتينية صغيرة وأرقامًا وشرطات. ابدأ وانتهِ بحرف أو رقم.'),
            'failed' => $L('failed', 'That did not work. Try again.', 'لم تنجح العملية. حاول مرة أخرى.'),
        ],
    ];
@endphp
@if ($dialog)
<div data-slot="{{ $attributes->get('data-slot', 'create-workspace-dialog') }}" x-data="nqWorkspaceForm(@js($config))" {{ $attributes->except('data-slot') }}>
    @if ($trigger && ! $trigger->isEmpty())
        <span x-on:click="open = true">{{ $trigger }}</span>
    @endif
    <x-nq::dialog x-model="open">
        <x-nq::dialog.content class="max-w-md">
            <x-nq::dialog.header>
                <x-nq::dialog.title>{{ $L('createTitle', 'Create a workspace', 'إنشاء مساحة عمل') }}</x-nq::dialog.title>
                <x-nq::dialog.description>{{ $L('createBody', 'A separate space for a team, a client or a project.', 'مساحة منفصلة لفريق أو عميل أو مشروع.') }}</x-nq::dialog.description>
            </x-nq::dialog.header>
@endif
<form data-slot="{{ $dialog ? 'create-workspace-form' : $attributes->get('data-slot', 'create-workspace-form') }}" novalidate x-on:submit.prevent="submit()"
    @unless ($dialog) x-data="nqWorkspaceForm(@js($config))" {{ $attributes->except('data-slot') }} @endunless
    class="flex flex-col gap-4">
    <x-nq::field x-model="nameBad">
        <x-nq::field.label>{{ $L('name', 'Workspace name', 'اسم مساحة العمل') }}</x-nq::field.label>
        <x-nq::field.input autocomplete="organization" :placeholder="$L('namePlaceholder', 'Sahab Studio', 'سحاب ستوديو')" x-bind:value="name" x-on:input="onName($event.target.value)" x-bind:disabled="busy" />
        <x-nq::field.error><span x-text="nameMsg"></span></x-nq::field.error>
    </x-nq::field>
    @if ($showSlug)
        <x-nq::workspace-settings.slug-field :label="$L('slug', 'Workspace address', 'عنوان مساحة العمل')" :prefix="$slugPrefix" />
    @endif
    <template x-if="formError !== null">
        <x-nq::alert tone="danger" role="alert"><span x-text="formError"></span></x-nq::alert>
    </template>
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        @if ($cancel || $dialog)
            <x-nq::button type="button" variant="ghost" x-on:click="cancel()" x-bind:disabled="busy ? '' : null">{{ $L('cancel', 'Cancel', 'إلغاء') }}</x-nq::button>
        @endif
        <x-nq::button type="submit" variant="primary" x-bind:aria-busy="busy ? 'true' : null" x-bind:data-disabled="busy ? '' : null">
            <x-nq::spinner x-show="busy" style="display: none" />
            {{ $submitLabel ?? $L('create', 'Create workspace', 'إنشاء مساحة العمل') }}
        </x-nq::button>
    </div>
</form>
@if ($dialog)
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
@endif
