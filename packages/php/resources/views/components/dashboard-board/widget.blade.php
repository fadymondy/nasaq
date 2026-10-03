{{-- <x-nq::dashboard-board.widget type="revenue"> <p x-text="setting(card, 'range')"></p> </x-nq::dashboard-board.widget>
     The body of one widget type, placed inside <x-nq::dashboard-board>. It is cloned into every card of that type. Inside it Alpine sees `card` (the card:
     id, cols, rows, settings), `setting(card, 'key')` (the saved value or the widget default), `span(card)` (columns it spans now) and `editing`. --}}
@props(['type'])
<template data-board-widget="{{ $type }}">{{ $slot }}</template>
