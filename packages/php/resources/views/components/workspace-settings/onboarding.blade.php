{{-- <x-nq::workspace-settings.onboarding slug-prefix="nasaq.app/" @create="$event.detail.wait(createWorkspace($event.detail.values))" />
     First run: a signed-in person with no workspace names one. A page (the auth-layout), or bare for just the form and its heading in your own layout.
     variant: card | split, mark, backdrop, origin (as auth-layout). slug-prefix, show-slug, default-name, labels, and the create / check-slug events of create-form.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['slugPrefix' => null, 'showSlug' => true, 'defaultName' => '', 'bare' => false, 'variant' => 'card', 'mark' => true, 'backdrop' => true, 'origin' => true, 'labels' => [], 'checkSlug' => false])
@php
    $L = fn (string $key, string $en, string $arabic) => $labels[$key] ?? \Nasaq\Nasaq::t($en, $arabic);
    $title = $L('onboardTitle', 'Create your workspace', 'أنشئ مساحة عملك');
    $body = $L('onboardBody', 'A workspace is where your team keeps everything. You can invite people next.', 'مساحة العمل هي المكان الذي يحفظ فيه فريقك كل شيء. يمكنك دعوة الآخرين بعدها.');
@endphp
@if ($bare)
    <section data-slot="workspace-onboarding-bare" class="flex flex-col gap-4">
        <header class="flex flex-col gap-1.5">
            <h1 class="text-h2 text-foreground">{{ $title }}</h1>
            <p class="text-body-sm text-muted-foreground">{{ $body }}</p>
        </header>
        <x-nq::workspace-settings.create-form data-slot="{{ $attributes->get('data-slot', 'workspace-onboarding') }}" :show-slug="$showSlug" :slug-prefix="$slugPrefix" :default-name="$defaultName" :check-slug="$checkSlug" :labels="$labels" {{ $attributes->except('data-slot') }} />
    </section>
@else
    <x-nq::auth-layout :variant="$variant" :mark="$mark" :backdrop="$backdrop" :origin="$origin" :title="$title" :description="$body">
        <x-nq::workspace-settings.create-form data-slot="{{ $attributes->get('data-slot', 'workspace-onboarding') }}" :show-slug="$showSlug" :slug-prefix="$slugPrefix" :default-name="$defaultName" :check-slug="$checkSlug" :labels="$labels" {{ $attributes->except('data-slot') }} />
    </x-nq::auth-layout>
@endif
