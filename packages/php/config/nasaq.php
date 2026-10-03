<?php

return [
    // Serve the stylesheet and scripts from a CDN instead of public/vendor/nasaq, e.g.
    // 'https://cdn.jsdelivr.net/npm/@fadymondy/nasaq@0.5/dist/cdn'. Null uses the published assets.
    'cdn' => env('NASAQ_CDN'),

    // The brand <x-nq::product-mark> and friends use when none is passed (nasaq, yes-delivery, …).
    'brand' => env('NASAQ_BRAND', 'nasaq'),

    // Currency for <x-nq::price> and friends. Null means USD, or SAR when the locale is Arabic.
    'currency' => env('NASAQ_CURRENCY'),
];
