@php
    $page = [
        'title' => 'Launch', 'slug' => 'launch', 'seoTitle' => '', 'seoDescription' => '', 'dir' => 'ltr', 'status' => 'draft',
        'sections' => [
            ['id' => 's-hero', 'type' => 'hero', 'visible' => true, 'data' => ['headline' => 'A headline that says it in one line', 'subheadline' => 'One or two sentences on who this is for and why it matters.', 'primaryLabel' => 'Get started', 'primaryHref' => '/signup', 'secondaryLabel' => 'Learn more', 'secondaryHref' => '#features', 'align' => 'center']],
            ['id' => 's-faq', 'type' => 'faq', 'visible' => true, 'data' => ['title' => 'Frequently asked questions', 'items' => [['id' => 'q1', 'question' => 'A common question?', 'answer' => 'A short, direct answer.']]]],
            ['id' => 's-cta', 'type' => 'cta', 'visible' => true, 'data' => ['title' => 'Ready to start?', 'body' => 'Set up in minutes. No card needed.', 'buttonLabel' => 'Create your account', 'buttonHref' => '/signup']],
        ],
    ];
@endphp
<x-nq::landing-page-editor :page="$page"
    @nq-landing-save="$event.detail.promise = api.save($event.detail.page)"
    @nq-landing-publish="$event.detail.promise = api.publish($event.detail.page)" />
