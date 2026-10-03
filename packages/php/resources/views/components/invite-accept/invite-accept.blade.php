{{-- <x-nq::invite-accept state="valid" :workspace="['name' => 'Sahab Studio', 'meta' => '12 members']" :invited-by="['name' => 'Sara Alharbi']" role="Admin"
         invite-email="omar@example.com" :account="['name' => 'Omar Khalid', 'email' => 'omar@example.com']" decline
         x-on:nq-invite-accept="$event.detail.waitUntil(join())" />
     The public page behind an invitation link. It handles the five things a link can turn out to be: a valid invitation (accept or decline, or sign in
     first), an expired one, one sent to another account than the one signed in, one already used, and one that was cancelled. It does no fetching: you
     resolve the link and pass state.
     state: valid | expired | wrong-account | already-accepted | revoked. workspace: ['name', 'logo', 'meta']. invited-by: ['name', 'email']. role, invite-email,
     expires-at: details for the valid state. account: ['name', 'email', 'avatar'] when signed in, null when signed out.
     Events (bubble from the page; detail.waitUntil(promise); resolve nothing for success or { error } to show a failure):
     nq-invite-accept, nq-invite-decline (shown with the decline attribute), nq-invite-request-new (expired; shown with the request-new attribute, then
     "We told them you asked for a new invitation."), nq-invite-switch-account (wrong account; reload or redirect from the listener).
     sign-in / sign-up / open-workspace / go-home: a URL renders a link button, `true` renders a button that fires nq-invite-sign-in / nq-invite-sign-up /
     nq-invite-open-workspace / nq-invite-go-home; sign-in defaults to true, the others are hidden unless set. bare renders only the content, without the page
     frame. variant, mark, backdrop, origin and the prompt / footer slots go to <x-nq::auth-layout>. labels: override any string
     (valid-title, valid-body, expired-body, … use {workspace} {who} {email} {invited} {current}). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['state', 'workspace', 'invitedBy' => null, 'role' => null, 'inviteEmail' => null, 'expiresAt' => null, 'account' => null, 'decline' => false, 'requestNew' => false,
    'signIn' => true, 'signUp' => null, 'openWorkspace' => null, 'goHome' => null, 'bare' => false, 'variant' => 'card', 'mark' => true, 'backdrop' => true, 'origin' => true,
    'prompt' => null, 'footer' => null, 'labels' => []])
@php
    $t = \Nasaq\Nasaq::class;
    $l = array_merge([
        'validTitle' => $t::t('Join {workspace}', 'الانضمام إلى {workspace}'),
        'validBody' => $t::t('{who} invited you to collaborate.', 'دعاك {who} للتعاون معه.'),
        'validBodyAnon' => $t::t('You have been invited to collaborate.', 'تمت دعوتك للتعاون.'),
        'invitedAs' => $t::t('You will join as', 'ستنضم بصفة'),
        'invitedEmail' => $t::t('Invitation for', 'الدعوة موجهة إلى'),
        'expiresOn' => $t::t('Expires', 'تنتهي'),
        'signedInAs' => $t::t('Signed in as', 'مسجّل الدخول باسم'),
        'accept' => $t::t('Accept invitation', 'قبول الدعوة'),
        'decline' => $t::t('Decline', 'رفض'),
        'signInToAccept' => $t::t('Sign in to accept', 'سجّل الدخول للقبول'),
        'createAccount' => $t::t('Create an account', 'إنشاء حساب'),
        'signInHint' => $t::t('Use {email} so this invitation matches your account.', 'استخدم {email} ليطابق حسابك هذه الدعوة.'),
        'expiredTitle' => $t::t('This invitation has expired', 'انتهت صلاحية هذه الدعوة'),
        'expiredBody' => $t::t('Invitations only work for a limited time. Ask {who} to send you a new one.', 'تعمل الدعوات لفترة محدودة. اطلب من {who} إرسال دعوة جديدة.'),
        'expiredBodyAnon' => $t::t('Invitations only work for a limited time. Ask the person who invited you to send a new one.', 'تعمل الدعوات لفترة محدودة. اطلب ممن دعاك إرسال دعوة جديدة.'),
        'requestNew' => $t::t('Ask for a new invitation', 'اطلب دعوة جديدة'),
        'requested' => $t::t('We told them you asked for a new invitation.', 'أبلغناهم بأنك طلبت دعوة جديدة.'),
        'wrongTitle' => $t::t('This invitation is for another account', 'هذه الدعوة لحساب آخر'),
        'wrongBody' => $t::t('It was sent to {invited}, but you are signed in as {current}.', 'أُرسلت إلى {invited}، لكنك مسجّل الدخول باسم {current}.'),
        'switchAccount' => $t::t('Sign in with another account', 'سجّل الدخول بحساب آخر'),
        'acceptedTitle' => $t::t('You have already joined', 'لقد انضممت بالفعل'),
        'acceptedBody' => $t::t('This invitation was used and you are a member of {workspace}.', 'استُخدمت هذه الدعوة وأنت عضو في {workspace}.'),
        'open' => $t::t('Open {workspace}', 'فتح {workspace}'),
        'revokedTitle' => $t::t('This invitation was cancelled', 'أُلغيت هذه الدعوة'),
        'revokedBody' => $t::t('{who} cancelled it. Ask them if you still need access.', 'ألغاها {who}. اسأله إن كنت لا تزال بحاجة إلى الوصول.'),
        'revokedBodyAnon' => $t::t('The person who invited you cancelled it. Ask them if you still need access.', 'ألغاها من دعاك. اسأله إن كنت لا تزال بحاجة إلى الوصول.'),
        'goHome' => $t::t('Go to your account', 'الانتقال إلى حسابك'),
        'failed' => $t::t('Something went wrong. Try again.', 'حدث خطأ ما. حاول مرة أخرى.'),
    ], (array) $labels);
    $fill = fn (string $s, array $v) => str_replace(array_map(fn ($k) => '{'.$k.'}', array_keys($v)), array_values($v), $s);
    $isolate = fn (string $v) => "\u{2068}".$v."\u{2069}";
    $who = $invitedBy['name'] ?? null;
    $name = $workspace['name'] ?? '';
    if ($state === 'valid') {
        $title = $fill($l['validTitle'], ['workspace' => $name]);
        $description = $who ? $fill($l['validBody'], ['who' => $who]) : $l['validBodyAnon'];
    } elseif ($state === 'expired') {
        $title = $l['expiredTitle'];
        $description = $who ? $fill($l['expiredBody'], ['who' => $who]) : $l['expiredBodyAnon'];
    } elseif ($state === 'wrong-account') {
        $title = $l['wrongTitle'];
        $description = $fill($l['wrongBody'], ['invited' => $isolate((string) $inviteEmail), 'current' => $isolate((string) ($account['email'] ?? ''))]);
    } elseif ($state === 'already-accepted') {
        $title = $l['acceptedTitle'];
        $description = $fill($l['acceptedBody'], ['workspace' => $name]);
    } else {
        $title = $l['revokedTitle'];
        $description = $who ? $fill($l['revokedBody'], ['who' => $who]) : $l['revokedBodyAnon'];
    }
    $content = [
        'state' => $state, 'workspace' => $workspace, 'role' => $role, 'inviteEmail' => $inviteEmail, 'expiresAt' => $expiresAt, 'account' => $account, 'decline' => $decline,
        'requestNew' => $requestNew, 'signIn' => $signIn, 'signUp' => $signUp, 'openWorkspace' => $openWorkspace, 'goHome' => $goHome, 'l' => $l,
        'signInHint' => $inviteEmail ? $fill($l['signInHint'], ['email' => $isolate((string) $inviteEmail)]) : null, 'openLabel' => $fill($l['open'], ['workspace' => $name]),
    ];
    $has = fn ($s) => $s && ! $s->isEmpty();
    $listeners = $attributes->whereStartsWith(['x-']);
    $frame = $attributes->whereDoesntStartWith(['x-'])->except('data-slot');
@endphp
@if ($bare)
    <section aria-labelledby="invite-accept-title" {{ $frame->cn('flex flex-col gap-4') }}>
        <header class="flex flex-col gap-1.5">
            <h1 id="invite-accept-title" class="text-h2 text-foreground">{{ $title }}</h1>
            <p class="text-body-sm text-muted-foreground">{{ $description }}</p>
        </header>
        <x-nq::invite-accept.content :root-slot="$attributes->get('data-slot', 'invite-accept')" :bag="$listeners" :content="$content" />
    </section>
@else
    <x-nq::auth-layout :variant="$variant" :title="$title" :description="$description" :mark="$mark" :backdrop="$backdrop" :origin="$origin" {{ $attributes->whereDoesntStartWith('x-')->except('data-slot') }}>
        <x-nq::invite-accept.content :root-slot="$attributes->get('data-slot', 'invite-accept')" :bag="$listeners" :content="$content" />
        @if ($has($prompt))
            <x-slot:prompt>{{ $prompt }}</x-slot:prompt>
        @endif
        @if ($has($footer))
            <x-slot:footer>{{ $footer }}</x-slot:footer>
        @endif
    </x-nq::auth-layout>
@endif
