@php
    $variables = [['key' => 'first_name', 'label' => 'First name', 'sample' => 'Sara']];
    $templates = [
        ['id' => 't1', 'name' => 'Welcome', 'category' => 'welcome', 'status' => 'active', 'subject' => 'Welcome, {{first_name}}', 'preheader' => 'Your account is ready.', 'body' => '<h2>Hello {{first_name}}</h2><p>Thanks for joining us.</p>', 'updatedAt' => '2026-09-20T10:00:00Z'],
        ['id' => 't2', 'name' => 'Order receipt', 'category' => 'transactional', 'status' => 'draft', 'subject' => 'Your receipt', 'body' => '<p>Thanks for your order, {{first_name}} {{oops}}.</p>', 'updatedAt' => '2026-09-22T10:00:00Z'],
    ];
@endphp
<x-nq::email-templates :templates="$templates" :variables="$variables" :sender="['name' => 'The team', 'email' => 'hello@example.com']"
    @nq-email-template-save="$event.detail.promise = api.saveTemplate($event.detail.template)"
    @nq-email-template-send-test="$event.detail.promise = api.sendTest($event.detail.template.id, $event.detail.email)" />
