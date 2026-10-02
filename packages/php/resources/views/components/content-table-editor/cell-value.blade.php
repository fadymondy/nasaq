{{-- Internal to <x-nq::content-table-editor>: what a cell shows when it is not being edited. Reads row, column and ri from the grid's scope. --}}
<span class="contents">
<template x-if="displayKind(column, row.cells[column.id]) === `empty`"><span class="text-muted-foreground/60" aria-hidden="true">—</span></template>
<template x-if="displayKind(column, row.cells[column.id]) === `number`"><span class="block w-full text-end tabular-nums" x-text="numberText(row.cells[column.id])"></span></template>
<template x-if="displayKind(column, row.cells[column.id]) === `date`"><span x-text="dateText(row.cells[column.id])"></span></template>
<template x-if="displayKind(column, row.cells[column.id]) === `url`">
    <span class="flex min-w-0 items-center gap-1.5">
        <bdi dir="ltr" class="min-w-0 truncate text-start underline decoration-nq-line-strong underline-offset-4" x-text="urlText(row.cells[column.id])"></bdi>
        <template x-if="isLink(row.cells[column.id])">
            <a x-bind:href="textOf(row.cells[column.id])" target="_blank" rel="noopener noreferrer" tabindex="-1" x-bind:aria-label="openLabel(ri)" x-on:click.stop
                class="shrink-0 rounded-[4px] text-muted-foreground hover:text-foreground"><x-lucide-external-link aria-hidden="true" class="size-3.5" /></a>
        </template>
    </span>
</template>
<template x-if="displayKind(column, row.cells[column.id]) === `select`">
    <span data-slot="badge" x-bind:style="tagStyle(column, row.cells[column.id])" x-text="optionLabel(column, row.cells[column.id])"
        class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-transparent bg-[var(--tag-soft)] px-1.5 text-caption font-medium text-[var(--tag-solid)]"></span>
</template>
<template x-if="displayKind(column, row.cells[column.id]) === `tags`">
    <span class="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
        <template x-for="v in tagList(row.cells[column.id])" :key="v">
            <span data-slot="badge" x-bind:style="tagStyle(column, v)" x-text="optionLabel(column, v)"
                class="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-transparent bg-[var(--tag-soft)] px-1.5 text-caption font-medium text-[var(--tag-solid)]"></span>
        </template>
    </span>
</template>
<template x-if="displayKind(column, row.cells[column.id]) === `text`"><span class="block min-w-0 truncate" dir="auto" x-text="textOf(row.cells[column.id])"></span></template>
</span>
