{{-- <x-nq::login-form.summary />   The auth forms' live error summary: the server message, or the list of fields to fix (each a button that focuses its field).
     It reads the enclosing form's Alpine scope (problems(), entries(), summaryTitle(), focusField(name)), so it works inside any
     auth form built on login-form-logic (login, register, forgot, reset, verify, two-factor…). Same markup as auth-layout.error-summary. --}}
<div tabindex="-1" class="sr-only" x-show="! problems()"></div>
<div tabindex="-1" data-slot="auth-error-summary" class="outline-none" x-show="problems()" style="display: none">
    <div data-slot="alert" data-tone="danger" role="alert" class="relative grid grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-card border p-3 text-start border-nq-danger/30 bg-nq-danger-soft">
        <x-lucide-circle-x aria-hidden="true" data-slot="alert-icon" class="mt-0.5 size-4 text-nq-danger-text" />
        <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5">
            <div data-slot="alert-title" class="text-label text-foreground" x-text="summaryTitle()"></div>
            <div data-slot="alert-description" class="text-body-sm text-muted-foreground" x-show="! error && entries().length" style="display: none">
                <ul class="flex list-disc flex-col gap-0.5 ps-4">
                    <template x-for="e in entries()" :key="e.name">
                        <li><button type="button" class="text-start underline underline-offset-2" x-on:click="focusField(e.name)" x-text="(e.label ? e.label + ': ' : '') + e.message"></button></li>
                    </template>
                </ul>
            </div>
        </div>
    </div>
</div>
