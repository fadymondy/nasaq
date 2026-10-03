{{-- <x-nq::testimonials.form x-on:nq-testimonial="$event.detail.waitUntil(send($event.detail.data))" />
     A public form for people to leave a testimonial: name, words, star rating, consent, a honeypot and a thank-you.
     ask-rating (true), require-rating (false), ask-email (false), ask-role (true: role and company), require-consent (true): which fields to show and require.
     thanks: the thank-you text. labels: array overriding the built-in texts (name, role, company, email, emailHint, quote, quoteHint, rating, consent, submit, thanks,
     another, honeypot, failed, errors with name, quote-short, quote-long, rating, email, consent).
     Listen for nq-testimonial on it ({ data, waitUntil(promise) }): data is { name, role, company, email, quote, rating, consent }, trimmed. Resolve nothing for success or
     { error } to keep the form and show the message; a rejection shows the failed text. Spam (honeypot filled) never fires it; the visitor still sees the thank-you.
     With no listener and an action attribute it submits natively (fields named by key, plus the honeypot website_url). When it is done the root gets data-state="done"
     and the thank-you panel (data-slot="testimonial-form-done") shows. The display is <x-nq::testimonials>. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['askRating' => true, 'requireRating' => false, 'askEmail' => false, 'askRole' => true, 'requireConsent' => true, 'thanks' => null, 'labels' => []])
@include('nasaq::components.testimonials._logic')
@php
    $t = nq_tm_words((array) $labels);
    $config = [
        'requireConsent' => (bool) $requireConsent, 'requireRating' => (bool) $requireRating, 'errors' => $t['errors'], 'failed' => $t['failed'],
        'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : app()->getLocale(),
    ];
@endphp
<form data-slot="{{ $attributes->get('data-slot', 'testimonial-form') }}" novalidate x-data="nqTestimonialForm(@js($config))" x-bind:data-state="done ? 'done' : null"
    x-on:submit.prevent="onSubmit()" {{ $attributes->except('data-slot')->cn('relative flex w-full flex-col gap-4') }}>
    <div x-show="! done" class="flex flex-col gap-4">
        <x-nq::field x-model="bad.name" data-field="name">
            <x-nq::field.label>{{ $t['name'] }}</x-nq::field.label>
            <x-nq::field.input name="name" autocomplete="name" x-model="v.name" />
            <x-nq::field.error><span x-text="fe.name"></span></x-nq::field.error>
        </x-nq::field>
        @if ($askRole)
            <div class="grid gap-4 sm:grid-cols-2">
                <x-nq::field>
                    <x-nq::field.label>{{ $t['role'] }}</x-nq::field.label>
                    <x-nq::field.input name="role" x-model="v.role" />
                </x-nq::field>
                <x-nq::field>
                    <x-nq::field.label>{{ $t['company'] }}</x-nq::field.label>
                    <x-nq::field.input name="company" autocomplete="organization" x-model="v.company" />
                </x-nq::field>
            </div>
        @endif
        @if ($askEmail)
            <x-nq::field x-model="bad.email" data-field="email">
                <x-nq::field.label>{{ $t['email'] }}</x-nq::field.label>
                <x-nq::field.input name="email" ltr inputmode="email" autocomplete="email" x-model="v.email" />
                <x-nq::field.description>{{ $t['emailHint'] }}</x-nq::field.description>
                <x-nq::field.error><span x-text="fe.email"></span></x-nq::field.error>
            </x-nq::field>
        @endif
        @if ($askRating)
            <x-nq::field x-model="bad.rating" data-field="rating">
                <x-nq::field.label>{{ $t['rating'] }}</x-nq::field.label>
                <div role="group" aria-label="{{ $t['rating'] }}" class="flex gap-1">
                    @foreach ([1, 2, 3, 4, 5] as $n)
                        <button type="button" aria-label="{{ nq_tm_stars($n, $t) }}" x-bind:aria-pressed="v.rating === {{ $n }} ? 'true' : 'false'" x-on:click="setRating({{ $n }})"
                            class="rounded-control p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                            <x-lucide-star aria-hidden="true" x-bind:class="starClass({{ $n }})" />
                        </button>
                    @endforeach
                </div>
                <input type="hidden" name="rating" x-bind:value="v.rating ?? ''">
                <x-nq::field.error><span x-text="fe.rating"></span></x-nq::field.error>
            </x-nq::field>
        @endif
        <x-nq::field x-model="bad.quote" data-field="quote">
            <x-nq::field.label>{{ $t['quote'] }}</x-nq::field.label>
            <x-nq::field.textarea name="quote" rows="5" x-model="v.quote" />
            <x-nq::field.description>
                <span class="tabular-nums" x-text="num(length())">{{ nq_tm_num(0) }}</span> / {{ nq_tm_fill($t['quoteHint'], ['max' => nq_tm_num(600)]) }}
            </x-nq::field.description>
            <x-nq::field.error><span x-text="fe.quote"></span></x-nq::field.error>
        </x-nq::field>
        @if ($requireConsent)
            <x-nq::field x-model="bad.consent" data-field="consent">
                <label class="flex items-start gap-2 text-body">
                    <x-nq::checkbox name="consent" value="1" x-model="v.consent" class="mt-1" />
                    <span>{{ $t['consent'] }}</span>
                </label>
                <x-nq::field.error><span x-text="fe.consent"></span></x-nq::field.error>
            </x-nq::field>
        @endif
        <div aria-hidden="true" class="pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
            <label>
                {{ $t['honeypot'] }}
                <input type="text" name="website_url" tabindex="-1" autocomplete="off" x-model="trap">
            </label>
        </div>
        <p role="alert" class="text-body-sm text-nq-danger-text" x-show="error" style="display: none" x-text="error"></p>
        <div>
            <x-nq::button type="submit" x-bind:disabled="pending" x-bind:aria-busy="pending ? 'true' : null">
                {{ $t['submit'] }}
            </x-nq::button>
        </div>
    </div>

    <div data-slot="testimonial-form-done" data-state="done" role="status" x-show="done" style="display: none" class="flex flex-col items-start gap-3 rounded-card border border-border bg-card p-5">
        <x-lucide-circle-check class="size-6 text-nq-success" aria-hidden="true" />
        <p class="text-body">{{ $thanks ?? $t['thanks'] }}</p>
        <x-nq::button type="button" variant="link" class="px-0" x-on:click="again()">{{ $t['another'] }}</x-nq::button>
    </div>
</form>
