{{-- <x-nq::auth-layout.origin />
     "Secure connection to <host>", or a warning on a page that is not a secure context. Filled in by the browser (Alpine nqAuthOrigin), hidden until then. --}}
@php
    $secureText = \Nasaq\Nasaq::t('Secure connection to', 'اتصال آمن بـ');
    $insecureText = \Nasaq\Nasaq::t("Not a secure connection. Don't enter a password on", 'الاتصال غير آمن. لا تُدخل كلمة المرور في');
@endphp
<p data-slot="auth-origin" x-data="nqAuthOrigin()" x-show="host" x-cloak hidden x-bind:data-secure="secure ? '' : null"
    {{ $attributes->cn('flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-caption text-muted-foreground') }}
    x-bind:class="secure ? '' : '!text-nq-danger-text'">
    <x-lucide-shield-check x-show="secure" aria-hidden="true" class="size-3.5 shrink-0 text-nq-success-text" />
    <x-lucide-shield-alert x-show="!secure" aria-hidden="true" class="size-3.5 shrink-0" />
    <span data-origin-text x-text="secure ? @js($secureText) : @js($insecureText)"></span>
    <bdi dir="ltr" class="font-medium text-foreground" x-text="host"></bdi>
</p>
